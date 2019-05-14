import { config } from '../../../config';
import { AuthenticationInterfaces } from '../../../models';
import {
  AuthenticationService,
  CouchbaseAnalyticsService,
  SyncGatewayService
} from '../../../services';
import { AuthenticationController, SyncGatewayController } from '../../../controllers';
import { SyncGatewayRoutes } from '../../../routes';
import { MockApi } from '../../helpers/mock-api';
import { PortalUserConstants } from '../../../constants';

const account_data = require('../../data/routes/sync-gateway.routes/account_data.json');

export class SyncGatewayRoutesShared {
  static getApi(): MockApi {
    const api = new MockApi();

    const couchbaseAnalyticsService = new CouchbaseAnalyticsService(config);
    const authenticationService = new AuthenticationService(config, null, null);
    const syncGatewayService = new SyncGatewayService(config);

    const authenticationController = new AuthenticationController(
      config,
      authenticationService,
      syncGatewayService
    );

    const syncGatewayController = new SyncGatewayController(
      couchbaseAnalyticsService,
      syncGatewayService
    );

    SyncGatewayRoutes.applyRoutes(api, authenticationController, syncGatewayController);

    return api;
  }

  static getSyncAdminDoc(userType: string, email): AuthenticationInterfaces.ISyncAdminDoc {
    if (userType === PortalUserConstants.IN2L_ADMIN) {
      return SyncGatewayRoutesShared.getSyncIn2lAdminDoc(email);
    } else if (userType === PortalUserConstants.IN2L_CONTENT) {
      return SyncGatewayRoutesShared.getSyncIn2lContentDoc(email);
    } else if (userType === PortalUserConstants.ACCOUNT_ADMIN) {
      return SyncGatewayRoutesShared.getSyncAccountAdminDoc(email);
    } else if (userType === PortalUserConstants.FACILITY_ADMIN) {
      return SyncGatewayRoutesShared.getSyncFacilityAdminDoc(email);
    }
    return null;
  }

  static getSyncIn2lAdminDoc(email: string): AuthenticationInterfaces.ISyncAdminDoc {
    const syncUsername = encodeURIComponent(email)
      .toLowerCase()
      .replace('%', '_');
    return {
      _id: `portal_sync_admin_${syncUsername}`,
      _rev: '1-363687616a0c82dafd707e4e6b9bd7cb',
      account_id: null,
      doc_type: 'sync_in2l-admin',
      email: email,
      facility_ids: null,
      syncUsername: syncUsername,
      type: 'in2l-admin',
      userProfileId: 'in2ladmin-64e3-4456-8cb9-dbd0bc051d30'
    };
  }

  static getSyncAccountAdminDoc(email: string): AuthenticationInterfaces.ISyncAdminDoc {
    const syncUsername = encodeURIComponent(email)
      .toLowerCase()
      .replace('%', '_');
    return {
      _id: `portal_sync_admin_${syncUsername}`,
      _rev: '2-363687616a0c82dafd707e4e6b9bd7cb',
      account_id: '789456',
      doc_type: 'sync_account-admin',
      email: email,
      facility_ids: null,
      syncUsername: syncUsername,
      type: 'account-admin',
      userProfileId: 'accountadmin-64e3-4456-8cb9-dbd0bc051d30'
    };
  }

  static getSyncFacilityAdminDoc(email: string): AuthenticationInterfaces.ISyncAdminDoc {
    const syncUsername = encodeURIComponent(email)
      .toLowerCase()
      .replace('%', '_');
    return {
      _id: `portal_sync_admin_${syncUsername}`,
      _rev: '3-363687616a0c82dafd707e4e6b9bd7cb',
      account_id: '789456',
      doc_type: 'sync_facility-admin',
      email: email,
      facility_ids: [
        '1b026150-a9a5-d55f-9599-b83c499f5b15',
        'cdebd977-5105-4c25-be9d-45b26bd2dea0'
      ],
      syncUsername: syncUsername,
      type: 'facility-admin',
      userProfileId: 'facilityadmin-64e3-4456-8cb9-dbd0bc051d30'
    };
  }

  static getSyncIn2lContentDoc(email: string): AuthenticationInterfaces.ISyncAdminDoc {
    const syncUsername = encodeURIComponent(email)
      .toLowerCase()
      .replace('%', '_');
    return {
      _id: `portal_sync_admin_${syncUsername}`,
      _rev: '4-363687616a0c82dafd707e4e6b9bd7cb',
      account_id: null,
      doc_type: 'sync_in2l',
      email: email,
      facility_ids: null,
      syncUsername: syncUsername,
      type: 'in2l',
      userProfileId: 'in2lcontent-64e3-4456-8cb9-dbd0bc051d30'
    };
  }

  static mapDocToKeyValueDocFormat(
    key: string,
    doc?: {
      _id: string;
      _rev: string;
    }
  ): {
    key: string;
    id?: string;
    value?: {
      rev: string;
    };
    doc?: any;
    error?: string;
    status?: number;
  } {
    if (!doc) {
      return {
        key,
        error: 'not_found',
        status: 404
      };
    }
    return {
      key: key,
      id: doc._id,
      value: { rev: doc._rev },
      doc
    };
  }

  static getAccountDataDocByNamespace(
    syncUserDoc: { type: string; account_id?: string; facility_ids?: string[] },
    namespace: string
  ): any[] {
    const namespacePrefix = `${namespace}_`;
    const docs = account_data.filter(doc => {
      if (!doc.doc_type.startsWith(namespacePrefix)) {
        return false;
      }

      if (syncUserDoc.type === PortalUserConstants.IN2L_ADMIN) {
        return true;
      }

      if (
        syncUserDoc.type === PortalUserConstants.ACCOUNT_ADMIN &&
        [doc._id, doc.account_id].includes(syncUserDoc.account_id)
      ) {
        return true;
      }

      if (syncUserDoc.type === PortalUserConstants.FACILITY_ADMIN) {
        if ([doc._id, doc.account_id].includes(syncUserDoc.account_id)) {
          return true;
        }

        if (
          syncUserDoc.facility_ids.includes(doc._id) ||
          syncUserDoc.facility_ids.includes(doc.facility_id)
        ) {
          return true;
        }
      }

      if (syncUserDoc.type === PortalUserConstants.IN2L_CONTENT && namespace === 'content') {
        return true;
      }

      return false;
    });

    SyncGatewayRoutesShared.validateMockDocuments(docs, syncUserDoc.type, namespace);

    return docs;
  }

  static getAccountDataDocsByDocType(
    syncUserDoc: { type: string; account_id?: string; facility_ids?: string[] },
    namespace: string,
    type: string
  ): any[] {
    const docType = `${namespace}_${type}`;
    const docs = account_data.filter(doc => {
      if (doc.doc_type !== docType) {
        return false;
      }

      if (syncUserDoc.type === PortalUserConstants.IN2L_ADMIN) {
        return true;
      }

      if (
        syncUserDoc.type === PortalUserConstants.ACCOUNT_ADMIN &&
        [doc._id, doc.account_id].includes(syncUserDoc.account_id)
      ) {
        return true;
      }

      if (syncUserDoc.type === PortalUserConstants.FACILITY_ADMIN) {
        if ([doc._id, doc.account_id].includes(syncUserDoc.account_id)) {
          return true;
        }

        if (
          syncUserDoc.facility_ids.includes(doc._id) ||
          syncUserDoc.facility_ids.includes(doc.facility_id)
        ) {
          return true;
        }
      }

      if (syncUserDoc.type === PortalUserConstants.IN2L_CONTENT && namespace === 'content') {
        return true;
      }

      return false;
    });

    SyncGatewayRoutesShared.validateMockDocuments(docs, syncUserDoc.type, namespace);

    return docs;
  }

  static validateMockDocuments(docs: any[], userType: string, namespace: string) {
    // Verify that the test data is valid. It is all to easy to make a test useless by mocking invalid data.
    const userHasAccountAccess = ![
      PortalUserConstants.FACILITY_USER,
      PortalUserConstants.IN2L_CONTENT
    ].includes(userType);
    const userHasContentAccess = [
      PortalUserConstants.IN2L_ADMIN,
      PortalUserConstants.IN2L_CONTENT
    ].includes(userType);

    // in2l-admin and in2l content users should have at least 1 document of each content namespace type
    if (namespace === 'content') {
      if (userHasContentAccess) {
        expect(docs.length).toBeGreaterThan(
          0,
          'Test is missing mock content documents. Please add at least one document of each doc_type.'
        );
      } else {
        expect(docs.length).toBe(
          0,
          'Test mock data is testing for invalid data. User without content access should not expect content documents.'
        );
      }
    }

    // All user types except facility-user and in2l content users should have at least 1 document of each account namespace type
    if (namespace === 'account') {
      if (userHasAccountAccess) {
        expect(docs.length).toBeGreaterThan(
          0,
          'Test is missing mock content documents. Please add at least one document of each doc_type.'
        );
      } else {
        expect(docs.length).toBe(
          0,
          'Test mock data is testing for invalid data. User without account access should not expect account documents.'
        );
      }
    }
  }
}
