import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { bucketNames, DocTypeConstants, viewNames } from '../constants';
import { SyncGatewayInterfaces, UnprovisionedDevice } from '../models';
import { SyncGatewayService } from '../services/sync-gateway.service';

export interface IViewUnprovisionedDevice {
  id: string;
  value: {
    account_id: string;
    facility_id: string;
    product: string;
  };
}

export interface IViewAccountFacilityName {
  id: string;
  value: {
    _id: string;
    name: string;
  };
}

export interface IDevice {
  doc_type: string;
  serial_number: string;

  _id?: string;
  account_id?: string;
  facility_id?: string;
  resident_ids?: string[];
}

export class ProvisioningController {
  private service: SyncGatewayService;

  constructor(syncGatewayService) {
    this.service = syncGatewayService;
  }

  getUnprovisionedDevices(
    product: string
  ): Observable<{ unprovisioned_devices: UnprovisionedDevice[] }> {
    return this.service
      .getView(bucketNames.ACCOUNT_DATA, viewNames.UNPROVISIONED_DEVICES, {
        key: product.toLowerCase()
      })
      .flatMap((data: IViewUnprovisionedDevice[]) => {
        if (!data || !data.length) {
          return Observable.forkJoin(Observable.of([]), Observable.of([]));
        }

        const devices = data.map(
          doc =>
            new UnprovisionedDevice(
              doc.value.account_id,
              doc.value.facility_id,
              doc.id,
              doc.value.product
            )
        );

        return Observable.forkJoin(
          Observable.of(devices),
          this.service.getView(bucketNames.ACCOUNT_DATA, viewNames.ACCOUNT_FACILITY_NAMES)
        );
      })
      .flatMap(
        ([devices, accountFacilityNames]: [UnprovisionedDevice[], IViewAccountFacilityName[]]) => {
          devices.forEach(device => {
            device.account_name = _.get(
              accountFacilityNames.find(afn => afn.value._id === device.account_id),
              'value.name',
              ''
            );
            device.facility_name = _.get(
              accountFacilityNames.find(afn => afn.value._id === device.facility_id),
              'value.name',
              ''
            );
          });

          devices.sort((a, b) => a.device_id.localeCompare(b.device_id));
          return Observable.of({
            unprovisioned_devices: devices
          });
        }
      );
  }

  updateSystemSpecs(input: any) {
    const output = {
      _id: input.apollo_system_id,
      doc_type: DocTypeConstants.DOC_TYPES.ACCOUNT.SYSTEM_INFO,
      product: 'apollo',
      system_info: input
    };
    console.log(output);
    return this.service.upsert(bucketNames.ACCOUNT_DATA, output);
  }

  provisionDevice(
    deviceId: string,
    serialNumber: string
  ): Observable<{ device: IDevice; residentIds: string[] }> {
    return Observable.forkJoin([
      this.service.getView(bucketNames.ACCOUNT_DATA, viewNames.DEVICE_ID_BY_SERIAL_NUMBER, {
        key: serialNumber
      }),
      this.service.get(bucketNames.ACCOUNT_DATA, deviceId),
      this.service.getAll(bucketNames.RESIDENT_DATA)
    ])
      .flatMap(
        ([serialNumberDeviceIds, device, residents]: [
          SyncGatewayInterfaces.IViewResult<string>[],
          IDevice,
          { _id: string; facility_id: string; serial_numbers: string[]; status: string }[]
        ]) => {
          if (serialNumberDeviceIds.length) {
            throw new Error('Serial number ' + serialNumber + ' has already been provisioned.');
          }

          if (!device) {
            throw new Error('Unable to retrieve device ID ' + deviceId);
          }

          if (device.doc_type !== DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE) {
            throw new Error('Invalid device ID');
          }

          if (device.serial_number) {
            throw new Error('The selected device is already provisioned. Please try again.');
          }

          if (!serialNumber || !serialNumber.match(/^[a-zA-Z0-9\-]+$/)) {
            throw new Error(
              'Invalid serial number. Serial numbers must only contain letters, numbers, and dashes.'
            );
          }

          const facilityResidents = residents.filter(
            r => r.facility_id === device.facility_id && r.status === 'active'
          );
          facilityResidents.forEach(r => {
            r.serial_numbers = _.uniq(r.serial_numbers.concat(serialNumber));
          });

          device.serial_number = serialNumber;
          return Observable.forkJoin(
            this.service.update(bucketNames.ACCOUNT_DATA, device),
            this.service.updateUser(bucketNames.ACCOUNT_DATA, serialNumber),
            this.service.updateUser(bucketNames.DOWNLOAD_STATUS_DATA, serialNumber),
            this.service.updateUser(bucketNames.FAVORITES_DATA, serialNumber),
            this.service.updateUser(bucketNames.RESIDENT_DATA, serialNumber),
            this.service.bulkUpdate(bucketNames.RESIDENT_DATA, facilityResidents)
          );
        }
      )
      .flatMap(
        ([
          device,
          accountDataUser,
          downloadStatusUser,
          favoritesUser,
          residentDataUser,
          updatedResidents
        ]: [IDevice, any, any, any, any, any]) => {
          return Observable.of({ device, residentIds: updatedResidents.map(value => value.id) });
        }
      );
  }
}
