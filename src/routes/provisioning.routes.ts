import * as ApiBuilder from 'claudia-api-builder';
import { Observable } from 'rxjs/Observable';

import { DeviceSyncAdmin } from '../models/device-sync-admin';
import {
  AuthenticationController,
  IDevice,
  ProvisioningController,
  SyncAdminController
} from '../controllers';
import { DocTypeConstants } from '../constants/doc-types';

export class ProvisioningRoutes {
  static applyRoutes(
    api: ApiBuilder,
    authenticationController: AuthenticationController,
    provisioningController: ProvisioningController,
    syncAdminController: SyncAdminController
  ) {
    api.get('/provisioning/unprovisioned-devices', request => {
      const product = (request.queryString.product || '').toLowerCase();
      if (!['engage', 'focus', 'rehab'].includes(product)) {
        throw new Error(
          'Invalid product in query string. Valid products include ENGAGE, FOCUS, and REHAB.'
        );
      }

      return provisioningController.getUnprovisionedDevices(product).toPromise();
    });

    api.put('/provisioning/engage-specs/{systemId}', request => {
      const systemId = request.pathParams.systemId;
      const input = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      if (!systemId || !systemId.length || systemId !== input.apollo_system_id) {
        return Observable.of(new api.ApiResponse('Invalid Apollo system ID', {}, 400)).toPromise();
      }

      return provisioningController.updateSystemSpecs(input).toPromise();
    });

    api.patch('/provisioning/provision-device/{deviceId}', request => {
      const deviceId = request.pathParams.deviceId;
      const serialNumber =
        typeof request.body === 'string'
          ? JSON.parse(request.body).serial_number
          : request.body.serial_number;

      if (!serialNumber) {
        throw new Error('Invalid serial number');
      }

      return provisioningController
        .provisionDevice(deviceId, serialNumber)
        .mergeMap((result: { device: IDevice; residentIds: string[] }) => {
          const device = result.device;
          const syncAdmin: DeviceSyncAdmin = {
            serial_number: device.serial_number,
            device_id: device._id,
            account_id: device.account_id,
            facility_id: device.facility_id,
            resident_ids: result.residentIds || [],
            type: DocTypeConstants.DOC_TYPES.SYNC.DEVICE_SYNC_ADMIN
          };
          return syncAdminController
            .updateDeviceUserSyncAdmin(syncAdmin)
            .mergeMap(() => Observable.of(device));
        })
        .toPromise();
    });
  }
}
