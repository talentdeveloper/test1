import * as ApiBuilder from 'claudia-api-builder';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { AuthenticationInterfaces, DeviceSyncAdmin, SyncGatewayInterfaces } from '../models';
import { AuthenticationController, SyncAdminController } from '../controllers';
import { RequestUtils } from '../utils/request-utils';

export class SyncAdminRoutes {
  static applyRoutes(
    api: ApiBuilder,
    authenticationController: AuthenticationController,
    syncAdminController: SyncAdminController
  ) {
    api.post('/syncadmin/portaluser', request => {
      const portalUser = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      const authHeaders = RequestUtils.getAuthenticationHeaders(request);
      const authenticationObservable = authenticationController.validatePortalToken(authHeaders);

      return authenticationObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }

          return syncAdminController
            .updatePortalUserSyncAdmin(portalUser)
            .flatMap((updateResults: SyncGatewayInterfaces.IUpdateResult[]) => {
              const result = updateResults.reduce(
                (final, current) => {
                  final.id = current.id || final.id;
                  final.ok = final.ok && !!current.ok;
                  return final;
                },
                { id: '', rev: '', ok: true }
              );

              return Observable.of(result);
            });
        })
        .toPromise();
    });

    api.post('/syncadmin/deviceuser', request => {
      const deviceSyncAdmin: DeviceSyncAdmin =
        typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      if (!deviceSyncAdmin.serial_number) {
        throw new Error('Invalid device serial number');
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

          return syncAdminController
            .updateDeviceUserSyncAdmin(deviceSyncAdmin)
            .flatMap(
              (
                updateResults: {
                  id?: string;
                  _id?: string;
                  rev?: string;
                  _rev?: string;
                  ok?: boolean;
                  reason?: string;
                }[]
              ) => {
                const result = updateResults.reduce(
                  (final, current) => {
                    current.ok = current.ok || !!current.rev || !!current._rev;
                    final.id = !!current.id ? current.id : final.id;
                    final.ok = final.ok && current.ok;
                    if (!current.ok) {
                      final.reason = JSON.stringify(current);
                    }
                    return final;
                  },
                  { id: '', rev: '', ok: true }
                );

                return Observable.of(result);
              }
            );
        })
        .toPromise();
    });

    api.delete('/syncadmin/deviceuser/{serial_number}', request => {
      const serialNumber = request.pathParams.serial_number;

      if (!serialNumber) {
        throw new Error('Invalid serial number');
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

          return syncAdminController.deleteDeviceUserSyncAdmin(serialNumber);
        })
        .toPromise();
    });
  }
}
