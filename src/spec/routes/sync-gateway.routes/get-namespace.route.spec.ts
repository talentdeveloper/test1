import * as _ from 'lodash';

import { config } from '../../../config';
import { DocMocker, RequestMocker } from '../../helpers';
import { SyncGatewayRoutesShared } from './sync-gateway-routes-shared';
import {
  PortalUserConstants,
  DocTypeConstants,
  CouchbaseAnalyticsQueries
} from '../../../constants';

const account_data = require('../../data/routes/sync-gateway.routes/account_data');

describe('Sync Gateway Pass-thru GET By Namespace Route', () => {
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

  /**
   * Happy Path GET doc by namespace for user type tests
   */
  [DocTypeConstants.DOC_NAMESPACES.ACCOUNT, DocTypeConstants.DOC_NAMESPACES.CONTENT].forEach(
    namespace => {
      describe(`Happy path for ${namespace} user accessing ${namespace} data`, () => {
        [
          PortalUserConstants.ACCOUNT_ADMIN,
          PortalUserConstants.FACILITY_ADMIN,
          PortalUserConstants.IN2L_ADMIN
        ].forEach(userType => {
          describe(`namespace: ${namespace}, user type: ${userType}`, () => {
            it('should succeed and return document with _id and _rev', done => {
              testIt(namespace, userType, true, done);
            });
          });
        });
      });
    }
  );

  /**
   * Permissions failure tests
   */
  describe('Content user accessing account data permissions failure tests', () => {
    const namespace = 'account';
    const userType = PortalUserConstants.IN2L_CONTENT;
    describe(`namespace: ${namespace}, user type: ${userType}`, () => {
      it('should fail and return 403 Forbidden', done => {
        testIt(namespace, userType, true, done);
      });
    });
  });

  describe('Non-content user accessing content data permissions failure tests', () => {
    const namespace = 'content';
    [PortalUserConstants.ACCOUNT_ADMIN, PortalUserConstants.FACILITY_ADMIN].forEach(userType => {
      describe(`namespace: ${namespace}, user type: ${userType}`, () => {
        it('should fail and return 403 Forbidden', done => {
          testIt(namespace, userType, true, done);
        });
      });
    });
  });

  /**
   * Authentication Failure Tests
   */
  describe('Authentication failure', () => {
    const namespace = 'account';
    const userType = 'in2l-admin';
    describe(`namespace: ${namespace}, user type: ${userType}`, () => {
      it('should return unauthorized when auth headers are not valid', done => {
        testIt(namespace, userType, false, done);
      });
    });
  });
});

/**
 * Shared test function
 */

function testIt(
  namespace: string,
  userType: string,
  shouldAuthenticate: boolean,
  done: () => void
) {
  const email = `test.${userType.replace('-', '')}@in2l.com`;
  const syncUserDoc = SyncGatewayRoutesShared.getSyncAdminDoc(userType, email);

  // To simplify debugging tests:
  // 1) Uncomment this code
  // 2) Change the docType and userType to the types that you want to debug
  // 3) Change shouldAuthicate to !shouldAuthenticate if you want to test invalid auth
  // 4) Set a break point on the console.log statement
  // 5) Recomment this if statement before committing you code

  // if (namespace === 'account' && userType === 'facility-admin' && shouldAuthenticate) {
  //   console.log('stop');
  // }

  // Get doc IDs for docs in namespace
  const docs = SyncGatewayRoutesShared.getAccountDataDocByNamespace(syncUserDoc, namespace);
  const docIds = docs.map(doc => doc._id).sort();

  // Determine if the user should have permission to GET this doc
  const userHasPermission = docs.length
    ? DocMocker.shouldHavePermission('GET', docs[0], syncUserDoc, true, true)
    : false;

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

  if (shouldAuthenticate && userHasPermission) {
    // Mock the request for the document IDs to request from Sync Gateway
    let statementParams = { $DOC_TYPE: `"${namespace}_%"` };
    if (syncUserDoc.account_id) {
      statementParams['$ACCOUNT_ID'] = syncUserDoc.account_id;
    }

    if (syncUserDoc.facility_ids) {
      statementParams['$FACILITY_IDS'] = syncUserDoc.facility_ids;
    }

    RequestMocker.mockCouchbaseAnalyticsRequest(
      CouchbaseAnalyticsQueries[
        `ID_BY_DOC_TYPE${syncUserDoc.account_id ? '_ACCOUNT' : ''}${
          syncUserDoc.facility_ids ? '_FACILITIES' : ''
        }`
      ],
      statementParams,
      docIds
    );

    // Get docs from sync gateway using doc IDs in keys query param
    const fullUrl = `${
      config.syncGateway.url
    }/account_data/_all_docs?include_docs=true&keys=[${docIds.map(id => `"${id}"`)}]`;
    if (fullUrl.length <= 2084) {
      RequestMocker.mockSyncGatewayGetRequest(
        /\/account_data\/_all_docs\?include_docs=true&keys=\[[^\]]+\]/,
        {
          rows: docIds.map(k =>
            SyncGatewayRoutesShared.mapDocToKeyValueDocFormat(
              k,
              account_data.find(d => d._id === k)
            )
          )
        }
      );
    } else {
      const keys1 = docIds.slice(0, Math.floor(docIds.length / 2));
      const keys2 = docIds.slice(Math.floor(docIds.length / 2));

      RequestMocker.mockSyncGatewayGetRequest(
        /\/account_data\/_all_docs\?include_docs=true&keys=\[[^\]]+\]/,
        // `/account_data/_all_docs?include_docs=true&keys=[${keys1.map(id => `"${id}"`)}]`,
        {
          rows: keys1.map(k =>
            SyncGatewayRoutesShared.mapDocToKeyValueDocFormat(
              k,
              account_data.find(d => d._id === k)
            )
          )
        }
      );

      RequestMocker.mockSyncGatewayGetRequest(
        /\/account_data\/_all_docs\?include_docs=true&keys=\[[^\]]+\]/,
        // `/account_data/_all_docs?include_docs=true&keys=[${keys2.map(id => `"${id}"`)}]`,
        {
          rows: keys2.map(k =>
            SyncGatewayRoutesShared.mapDocToKeyValueDocFormat(
              k,
              account_data.find(d => d._id === k)
            )
          )
        }
      );
    }
  }

  // 2) CALL THE FUNCTION UNDER TEST
  const api = SyncGatewayRoutesShared.getApi();
  const mockRequest = api.buildRequest(
    'GET',
    `https://connectapi.test/sync-gateway/namespaces/${namespace}/docs`,
    RequestMocker.getPortalAuthHeaders(email)
  );
  api.callGetRoute(mockRequest).then(
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
        // Expect GET to fail due to lack of permissions
        expect(result.message).toBe(
          'User does not have permission to access these documents.',
          'Expected "User does not have permission to access these documents." message but got ${result.message}'
        );
        expect(result.statusCode).toBe(
          403,
          `Expected status code 403 but got ${result.statusCode}`
        );
      } else {
        // Expect the get to succeed
        expect(result.length).toBe(
          docIds.length,
          `Expected ${docIds.length} documents but got ${result.length} documents.`
        );
        expect(result.filter(doc => !doc.doc_type.startsWith(namespace)).length).toBe(
          0,
          `Expected only documents in namespace ${namespace} but got ${
            result.filter(doc => !doc.doc_type.startsWith(namespace)).length
          } non-${namespace} docs`
        );
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
