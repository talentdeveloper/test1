import * as _ from 'lodash';

import { DocMocker, RequestMocker } from '../../helpers';
import { SyncGatewayRoutesShared } from './sync-gateway-routes-shared';
import { PortalUserConstants, DocTypeConstants } from '../../../constants';

const account_data = require('../../data/routes/sync-gateway.routes/account_data');

describe('Sync Gateway Pass-thru POST Namespace, Type, and ID Route', () => {
  beforeAll(() => {
    RequestMocker.disableNetRequests();
  });

  beforeEach(() => {
    RequestMocker.clearMockedRequests();
  });

  afterAll(() => {
    RequestMocker.clearMockedRequests();
    RequestMocker.enableNetRequests();
  });

  const namespaceTypes = {
    account: Object.keys(DocTypeConstants.DOC_TYPES.ACCOUNT).map(type =>
      DocTypeConstants.DOC_TYPES.ACCOUNT[type].replace(/^account_/, '').toLowerCase()
    ),
    content: Object.keys(DocTypeConstants.DOC_TYPES.CONTENT).map(type =>
      DocTypeConstants.DOC_TYPES.CONTENT[type].replace(/^content_/, '').toLowerCase()
    )
  };

  /**
   * Happy Path Post doc by namespace and type for user type tests
   */
  describe('Happy path for account user accessing account data', () => {
    const namespace = 'account';
    namespaceTypes[namespace].forEach(type => {
      // Skip system-info docs. These will become Engage device docs eventually.
      if (type === 'system-info') {
        return;
      }

      [
        PortalUserConstants.ACCOUNT_ADMIN,
        PortalUserConstants.FACILITY_ADMIN,
        PortalUserConstants.IN2L_ADMIN
      ].forEach(userType => {
        describe(`namespace: ${namespace}, type: ${type}, user type: ${userType}`, () => {
          it('should succeed and return document with _id and _rev', done => {
            testIt(namespace, type, userType, true, done);
          });
        });
      });
    });
  });

  describe('Happy path for content user accessing content data', () => {
    const namespace = 'content';
    namespaceTypes[namespace].forEach(type => {
      [PortalUserConstants.IN2L_CONTENT, PortalUserConstants.IN2L_ADMIN].forEach(userType => {
        describe(`namespace: ${namespace}, type: ${type}, user type: ${userType}`, () => {
          it('should succeed and return document with _id and _rev', done => {
            testIt(namespace, type, userType, true, done);
          });
        });
      });
    });
  });

  /**
   * Permissions failure tests
   */
  describe('Content user accessing account data permissions failure tests', () => {
    const namespace = 'account';
    const userType = PortalUserConstants.IN2L_CONTENT;
    namespaceTypes[namespace].forEach(type => {
      // Skip system-info docs. These will become Engage device docs eventually.
      if (type === 'system-info') {
        return;
      }

      describe(`namespace: ${namespace}, type: ${type}, user type: ${userType}`, () => {
        it('should fail and return 403 Forbidden', done => {
          testIt(namespace, type, userType, true, done);
        });
      });
    });
  });

  describe('Non-content user accessing content data permissions failure tests', () => {
    const namespace = 'content';
    namespaceTypes[namespace].forEach(type => {
      [PortalUserConstants.ACCOUNT_ADMIN, PortalUserConstants.FACILITY_ADMIN].forEach(userType => {
        describe(`namespace: ${namespace}, type: ${type}, user type: ${userType}`, () => {
          it('should fail and return 403 Forbidden', done => {
            testIt(namespace, type, userType, true, done);
          });
        });
      });
    });
  });

  /**
   * Authentication Failure Tests
   */
  describe('Authentication failure', () => {
    const namespace = 'account';
    const type = 'device';
    const userType = 'in2l-admin';
    describe(`namespace: ${namespace}, type: ${type}, user type: ${userType}`, () => {
      it('should return unauthorized when auth headers are not valid', done => {
        testIt(namespace, type, userType, false, done);
      });
    });
  });
});

/**
 * Shared test function
 */

function testIt(
  namespace: string,
  type: string,
  userType: string,
  shouldAuthenticate: boolean,
  done: () => void
) {
  const docType = `${namespace}_${type}`;

  const email = `test.${userType.replace('-', '')}@in2l.com`;
  const syncUserDoc = SyncGatewayRoutesShared.getSyncAdminDoc(userType, email);

  // To simplify debugging tests:
  // 1) Uncomment this code
  // 2) Change the docType and userType to the types that you want to debug
  // 3) Change shouldAuthicate to !shouldAuthenticate if you want to test invalid auth
  // 4) Set a break point on the console.log statement
  // 5) Recomment this if statement before committing you code

  // if (docType === 'account_device-status' && userType === 'facility-admin' && shouldAuthenticate) {
  //   console.log('stop');
  // }

  const doc = Object.assign(
    {},
    account_data
      .filter(d => d.doc_type === docType)
      .find(d => {
        if (docType.startsWith('content')) {
          return true;
        }

        if (syncUserDoc.type === PortalUserConstants.ACCOUNT_ADMIN) {
          return [d._id, d.account_id].includes(syncUserDoc.account_id);
        }

        if (syncUserDoc.type === PortalUserConstants.FACILITY_ADMIN) {
          return (
            syncUserDoc.account_id === d._id ||
            syncUserDoc.facility_ids.includes(d._id) ||
            syncUserDoc.facility_ids.includes(d.facility_id)
          );
        }

        return true;
      })
  );

  expect(doc).toBeDefined(
    `Expected to find a doc of doc_type ${docType} but no doc of that doc_type was found.`
  );

  // Posted docs do not have preset _id or _rev properties
  delete doc._id;
  delete doc._rev;

  // Determine if the user should have permission to POST this doc
  const userHasPermission = DocMocker.shouldHavePermission('POST', doc, syncUserDoc, true, true);

  // 1) MOCK HTTP REQUESTS

  // Mock the Portal API auth request
  RequestMocker.mockPortalAuthRequest(email, shouldAuthenticate);

  // Mock the request for the users sync admin doc
  if (shouldAuthenticate) {
    RequestMocker.mockSyncGatewayGetRequest(
      '/account_data/portal_sync_admin_' + email.replace('@', '_40'),
      syncUserDoc
    );
  }

  // Mock the request for the final document to be returned
  const mockRev = '1-new-rev-uuid';
  if (shouldAuthenticate && userHasPermission) {
    RequestMocker.mockSyncGatewayPutRequest(
      /\/account_data\/[a-zA-Z0-9\-]+/,
      { doc_type: /^[a-z_\-]+$/, _id: /^[a-z0-9\-]+$/ },
      JSON.stringify({ id: '', ok: true, rev: mockRev })
    );
  }

  // 2) CALL THE FUNCTION UNDER TEST
  const api = SyncGatewayRoutesShared.getApi();
  const mockRequest = api.buildRequest(
    'POST',
    `https://connectapi.test/sync-gateway/namespaces/${namespace}/types/${type}/docs`,
    RequestMocker.getPortalAuthHeaders(email),
    doc
  );
  api.callPostRoute(mockRequest).then(
    result => {
      // 3) VERIFY RESULTS
      expect(result).toBeDefined(
        `Expected a json document to be returned but the result was undefined.`
      );

      if (!shouldAuthenticate) {
        // Expect authentication to fail
        expect(result.message).toBe(
          'Unauthorized',
          'Expected user authrentication to fail with message "Unauthorized" but got message ' +
            result.message
        );
        expect(result.statusCode).toBe(
          401,
          'Expected status code 401 Unauthorized but got ' + result.statusCode
        );
      } else if (!userHasPermission) {
        // Expect post to fail due to lack of permissions
        expect(result.message).toBe(
          'User does not have permission to create this document.',
          'Expected "User does not have permission to create this document." message but got ${result.message}'
        );
        expect(result.statusCode).toBe(
          403,
          `Expected status code 403 but got ${result.statusCode}`
        );
      } else {
        // Expect the post to succeed
        expect(result._id).toBeDefined(`Expected _id to be defined but it was undefined`);
        expect(result._rev).toBe(mockRev, `Expected _rev to be ${mockRev} but got ${result._rev}`);
      }

      done();
    },
    errorResult => {
      expect(false).toBe(
        true,
        `Unexpected failure caused the error function to be called. Message: ${errorResult.message}`
      );
      done();
    }
  );
}
