import * as ApiBuilder from 'claudia-api-builder';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { AuthenticationInterfaces, DeviceSyncAdmin, SyncGatewayInterfaces } from '../models';
import { AuthenticationController, SyncGatewayController } from '../controllers';
import { RequestUtils } from '../utils/request-utils';
import { DocTypeConstants, PortalUserConstants } from '../constants';

/**
 * Sync Gateway Pass-thru Routes
 * These routes provide access to documents by doc_type namespace and type.
 * Documents located in the account_data bucket have doc_type set to {namespace}_{type}.
 * These documents should be accessed using these two parts of the doc_type.
 * Documents located in other buckets have either a type field or a doc_type field. These
 * documents are set to type but do not include a namespace. The namespace route parameter
 * should be set to the bucket name for these documents. The type route parameter should be
 * set to the value of the type or doc_type of the document as appropriate.
 */
export class SyncGatewayRoutes {
  static applyRoutes(
    api: ApiBuilder,
    authenticationController: AuthenticationController,
    syncGatewayController: SyncGatewayController
  ) {
    // Get all documents in a namespace (or a bucket)
    api.get('/sync-gateway/namespaces/{namespace}/docs', request => {
      const namespace = request.pathParams.namespace;
      if (!namespace || !['account', 'content'].includes(namespace)) {
        return Observable.of(api.ApiResponse('Invalid document namespace.', {}, 400));
      }

      const authHeaders = RequestUtils.getAuthenticationHeaders(request);
      const authenticationObservable = authenticationController.validatePortalToken(authHeaders);

      return authenticationObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }

          if (!authenticationController.hasNamespacePermission(namespace, authResult.userType)) {
            return Observable.of(
              new api.ApiResponse(
                'User does not have permission to access these documents.',
                {},
                403
              )
            );
          }

          return syncGatewayController.getDocsByNamespace(
            namespace,
            authResult.userType,
            authResult.account_id,
            authResult.facility_ids
          );
        })
        .toPromise();
    });

    // Get all docments in a namespace of type
    api.get('/sync-gateway/namespaces/{namespace}/types/{type}/docs', request => {
      const namespace = request.pathParams.namespace;
      if (!namespace || !['account', 'content'].includes(namespace)) {
        return Observable.of(api.ApiResponse('Invalid document namespace.', {}, 400));
      }

      const type = request.pathParams.type;
      if (!type || !DocTypeConstants.isValidDocType(`${namespace}_${type}`)) {
        return Observable.of(api.ApiResponse('Invalid document type.', {}, 400));
      }

      const authHeaders = RequestUtils.getAuthenticationHeaders(request);
      const authenticationObservable = authenticationController.validatePortalToken(authHeaders);

      return authenticationObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }

          if (!authenticationController.hasNamespacePermission(namespace, authResult.userType)) {
            return Observable.of(
              new api.ApiResponse(
                'User does not have permission to access these documents.',
                {},
                403
              )
            );
          }

          return syncGatewayController.getDocsByNamespaceType(
            namespace,
            type,
            authResult.userType,
            authResult.account_id,
            authResult.facility_ids
          );
        })
        .toPromise();
    });

    // Get a single document in a namespace and type
    api.get('/sync-gateway/namespaces/{namespace}/types/{type}/docs/{id}', request => {
      const namespace = request.pathParams.namespace;
      if (!namespace || !['account', 'content'].includes(namespace)) {
        return Observable.of(new api.ApiResponse('Invalid document namespace.', {}, 400));
      }

      const type = request.pathParams.type;
      if (!type || !DocTypeConstants.isValidDocType(`${namespace}_${type}`)) {
        return Observable.of(new api.ApiResponse('Invalid document type.', {}, 400));
      }

      const id = request.pathParams.id;
      if (!id) {
        return Observable.of(new api.ApiResponse('Invalid document ID.', {}, 400));
      }

      const authHeaders = RequestUtils.getAuthenticationHeaders(request);
      const authenticationObservable = authenticationController.validatePortalToken(authHeaders);

      return authenticationObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }

          return syncGatewayController.getDoc(namespace, type, id).mergeMap(doc => {
            if (!doc) {
              return Observable.of(new api.ApiResponse('Not Found', {}, 404));
            }

            if (
              !authenticationController.hasPermission(
                'GET',
                doc,
                authResult.userType,
                authResult.account_id,
                authResult.facility_ids
              )
            ) {
              return Observable.of(
                new api.ApiResponse(
                  'User does not have permission to access this document.',
                  {},
                  403
                )
              );
            }

            return Observable.of(doc);
          });
        })
        .toPromise();
    });

    // Post a new document in a namespace and type
    api.post('/sync-gateway/namespaces/{namespace}/types/{type}/docs', request => {
      const namespace = request.pathParams.namespace;
      if (!namespace || !['account', 'content'].includes(namespace)) {
        return Observable.of(new api.ApiResponse('Invalid document namespace.', {}, 400));
      }

      const type = request.pathParams.type;
      if (!type || !DocTypeConstants.isValidDocType(`${namespace}_${type}`)) {
        return Observable.of(new api.ApiResponse('Invalid document type.', {}, 400));
      }

      const doc = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      const authHeaders = RequestUtils.getAuthenticationHeaders(request);
      const authenticationObservable = authenticationController.validatePortalToken(authHeaders);

      return authenticationObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }

          if (
            !authenticationController.hasPermission(
              'POST',
              doc,
              authResult.userType,
              authResult.account_id,
              authResult.facility_ids
            )
          ) {
            return Observable.of(
              new api.ApiResponse('User does not have permission to create this document.', {}, 403)
            );
          }

          return syncGatewayController.postDoc(doc);
        })
        .toPromise();
    });

    // Update a document in a namespace and type
    api.put('/sync-gateway/namespaces/{namespace}/types/{type}/docs', request => {
      const namespace = request.pathParams.namespace;
      if (!namespace || !['account', 'content'].includes(namespace)) {
        return Observable.of(new api.ApiResponse('Invalid document namespace.', {}, 400));
      }

      const type = request.pathParams.type;
      if (!type || !DocTypeConstants.isValidDocType(`${namespace}_${type}`)) {
        return Observable.of(new api.ApiResponse('Invalid document type.', {}, 400));
      }

      const doc = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      const authHeaders = RequestUtils.getAuthenticationHeaders(request);
      const authenticationObservable = authenticationController.validatePortalToken(authHeaders);

      return authenticationObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }

          if (
            !authenticationController.hasPermission(
              'PUT',
              doc,
              authResult.userType,
              authResult.account_id,
              authResult.facility_ids
            )
          ) {
            return Observable.of(
              new api.ApiResponse('User does not have permission to update this document.', {}, 403)
            );
          }

          return syncGatewayController.putDoc(doc);
        })
        .toPromise();
    });

    // Delete a single document in a namespace
    api.delete('/sync-gateway/namespaces/{namespace}/types/{type}/docs/{id}', request => {
      const namespace = request.pathParams.namespace;
      if (!namespace || !['account', 'content'].includes(namespace)) {
        return Observable.of(new api.ApiResponse('Invalid document namespace.', {}, 400));
      }

      const type = request.pathParams.type;
      if (!type || !DocTypeConstants.isValidDocType(`${namespace}_${type}`)) {
        return Observable.of(new api.ApiResponse('Invalid document type.', {}, 400));
      }

      const id = request.pathParams.id;
      if (!id) {
        return Observable.of(new api.ApiResponse('Invalid document ID.', {}, 400));
      }

      const authHeaders = RequestUtils.getAuthenticationHeaders(request);
      const authenticationObservable = authenticationController.validatePortalToken(authHeaders);

      return authenticationObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }

          return syncGatewayController.getDoc(namespace, type, id).mergeMap(doc => {
            if (!doc) {
              return Observable.of(new api.ApiResponse('Not Found', {}, 404));
            }

            if (
              !authenticationController.hasPermission(
                'DELETE',
                doc,
                authResult.userType,
                authResult.account_id,
                authResult.facility_ids
              )
            ) {
              return Observable.of(
                new api.ApiResponse(
                  'User does not have permission to delete this document.',
                  {},
                  403
                )
              );
            }

            return syncGatewayController.deleteDoc(doc);
          });
        })
        .toPromise();
    });
  }
}
