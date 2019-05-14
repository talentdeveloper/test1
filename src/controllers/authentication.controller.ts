import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import { ConfigInterfaces, SyncGatewayInterfaces } from '../models';

import { AuthenticationService, SyncGatewayService } from '../services';
import { AuthenticationInterfaces } from '../models';
import {
  bucketNames,
  AuthenticationResponses,
  PortalUserConstants,
  DocTypeConstants
} from '../constants';

const VALID_EMAIL_PATTERN = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

export class AuthenticationController {
  constructor(
    private config: ConfigInterfaces.IConfig,
    private authenticationService: AuthenticationService,
    private syncGatewayService: SyncGatewayService
  ) {}

  validateGoogleOAuth(
    bearerToken: string,
    email: string,
    sourceOS: string
  ): Observable<{ isAuthorized: boolean; errorMessage?: string; errorCode?: number }> {
    const emailIsValid = !!email && VALID_EMAIL_PATTERN.test(email);
    if (!emailIsValid) {
      return Observable.of(AuthenticationResponses.INVALID_EMAIL);
    }

    if (
      this.config.allowTestOAuth &&
      [this.config.testOAuthValue, `bearer ${this.config.testOAuthValue}`].includes(
        (bearerToken || '').toLowerCase()
      )
    ) {
      return Observable.of(AuthenticationResponses.AUTHORIZED);
    }

    const token = (bearerToken || '').length > 7 ? bearerToken.slice(7) : '';

    if (sourceOS !== 'ios' && sourceOS !== 'android') {
      return Observable.of(AuthenticationResponses.INVALID_SOURCEOS);
    }

    return this.authenticationService.validateGoogleOAuth(email, token, sourceOS);
  }

  validatePortalToken(
    authHeaders: AuthenticationInterfaces.IAuthenticationHeaders
  ): Observable<AuthenticationInterfaces.IAuthenticationResult> {
    if ((authHeaders.tokenType || '').toLowerCase() === 'bearer') {
      return this.authenticationService.validatePortalToken(authHeaders).mergeMap(authResponse => {
        if (!authResponse.isAuthorized) {
          return Observable.of(
            Object.assign({}, authResponse, {
              account_id: '',
              email: '',
              facility_ids: [],
              userType: ''
            })
          );
        }

        const syncAdminDocId =
          'portal_sync_admin_' +
          encodeURIComponent(authHeaders.uid)
            .toLowerCase()
            .replace(/%/g, '_');
        return this.syncGatewayService
          .get(bucketNames.ACCOUNT_DATA, syncAdminDocId)
          .mergeMap(
            (syncAdminDoc: {
              account_id: string;
              email: string;
              facility_ids: string[];
              type: string;
            }) => {
              if (syncAdminDoc && syncAdminDoc.email === authHeaders.uid) {
                return Observable.of(
                  Object.assign(
                    {
                      account_id: syncAdminDoc.account_id || '',
                      email: syncAdminDoc.email || '',
                      facility_ids: syncAdminDoc.facility_ids || [],
                      userType: syncAdminDoc.type || ''
                    },
                    { isAuthorized: true }
                  )
                );
              }

              return Observable.of({
                isAuthorized: false,
                errorMessage: 'Unauthorized',
                errorCode: 401
              });
            }
          );
      });
    }

    if ((authHeaders.tokenType || '').toLowerCase() === 'basic') {
      return this.syncGatewayService
        .get(bucketNames.ACCOUNT_DATA, '')
        .mergeMap((dbInfo: { db_name?: string; state?: string; error?: string }) => {
          if (
            dbInfo.db_name === bucketNames.ACCOUNT_DATA &&
            dbInfo.state === 'Online' &&
            !dbInfo.error
          ) {
            return Observable.of({ isAuthorized: true });
          }

          return Observable.of({
            isAuthorized: false,
            errorMessage: 'Unauthorized',
            errorCode: 401
          });
        });
    }

    return Observable.of(AuthenticationResponses.UNAUTHORIZED);
  }

  hasPermission(
    action: 'GET' | 'POST' | 'PUT' | 'DELETE',
    doc: SyncGatewayInterfaces.ISyncGatewayDocument,
    userType: string,
    userAccountId: string = '',
    userFacilityIds: string[] = []
  ): boolean {
    if (
      !doc.doc_type ||
      !doc.doc_type.includes('_') ||
      doc.doc_type === DocTypeConstants.DOC_TYPES.ACCOUNT.SYSTEM_INFO
    ) {
      return false;
    }

    const namespace = doc.doc_type.split('_')[0];

    // User type: in2l-admin
    if (userType === PortalUserConstants.IN2L_ADMIN) {
      return (
        namespace === DocTypeConstants.DOC_NAMESPACES.CONTENT ||
        [
          DocTypeConstants.DOC_TYPES.ACCOUNT.ACCOUNT,
          DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE,
          DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE_STATUS,
          DocTypeConstants.DOC_TYPES.ACCOUNT.FACILITY
        ].includes(doc.doc_type)
      );
    }

    // User type: in2l (content)
    if (userType === PortalUserConstants.IN2L_CONTENT) {
      return namespace === DocTypeConstants.DOC_NAMESPACES.CONTENT;
    }

    // User type: account-admin
    if (userType === PortalUserConstants.ACCOUNT_ADMIN) {
      if (action === 'GET' || action === 'PUT') {
        if (doc.doc_type === DocTypeConstants.DOC_TYPES.ACCOUNT.ACCOUNT) {
          return doc._id === userAccountId;
        }

        return doc.account_id === userAccountId;
      }

      if (action === 'POST' || action === 'DELETE') {
        return [
          DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE,
          DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE_STATUS,
          DocTypeConstants.DOC_TYPES.ACCOUNT.FACILITY
        ].includes(doc.doc_type);
      }
    }

    // User type: facility-admin
    if (userType === PortalUserConstants.FACILITY_ADMIN) {
      if (action === 'GET') {
        return (
          doc._id === userAccountId || // Get the account document
          userFacilityIds.includes(doc._id) || // Get the facilities the user has access to
          userFacilityIds.includes(doc.facility_id) // Get device and device_status docs in the users facilities
        );
      }

      if (action === 'PUT') {
        // Allow update to the facilities the user has access to
        // Allow update to device and device_status docs in the users facilities
        return userFacilityIds.includes(doc._id) || userFacilityIds.includes(doc.facility_id);
      }

      if (action === 'POST' || action === 'DELETE') {
        return [
          DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE, // Allow creation of new device docs
          DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE_STATUS // Allow creation of new device status docs
        ].includes(doc.doc_type);
      }
    }

    return false; // Facility users have no access
  }

  hasNamespacePermission(namespace: string, userType: string): boolean {
    if (namespace === DocTypeConstants.DOC_NAMESPACES.ACCOUNT) {
      return ![PortalUserConstants.FACILITY_USER, PortalUserConstants.IN2L_CONTENT].includes(
        userType
      );
    }

    if (namespace === DocTypeConstants.DOC_NAMESPACES.CONTENT) {
      return [PortalUserConstants.IN2L_ADMIN, PortalUserConstants.IN2L_CONTENT].includes(userType);
    }

    return false;
  }
}
