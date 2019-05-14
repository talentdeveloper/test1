import * as _ from 'lodash';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { bucketNames, DocTypeConstants, PortalUserConstants } from '../constants';
import { DeviceSyncAdmin, PortalSyncAdmin, SyncGatewayInterfaces } from '../models';
import { SyncGatewayService } from '../services';

const userTypeBuckets = {
  [PortalUserConstants.FACILITY_ADMIN]: [
    bucketNames.ACCOUNT_DATA,
    bucketNames.FAVORITES_DATA,
    bucketNames.MESSAGE_DATA,
    bucketNames.RESIDENT_DATA,
    bucketNames.USER_PROFILE_DATA
  ],
  [PortalUserConstants.ACCOUNT_ADMIN]: [
    bucketNames.ACCOUNT_DATA,
    bucketNames.FAVORITES_DATA,
    bucketNames.MESSAGE_DATA,
    bucketNames.RESIDENT_DATA,
    bucketNames.USER_PROFILE_DATA
  ],
  [PortalUserConstants.IN2L_CONTENT]: [
    bucketNames.CONTENT_META_DATA,
    bucketNames.USER_PROFILE_DATA
  ],
  [PortalUserConstants.IN2L_ADMIN]: [
    bucketNames.ACCOUNT_DATA,
    bucketNames.CONTENT_META_DATA,
    bucketNames.DOWNLOAD_STATUS_DATA,
    bucketNames.FAVORITES_DATA,
    bucketNames.MESSAGE_DATA,
    bucketNames.RESIDENT_DATA,
    bucketNames.USER_PROFILE_DATA
  ]
};

const requiresPortalUserSyncAdminDoc = {
  [bucketNames.ACCOUNT_DATA]: true,
  [bucketNames.CONTENT_META_DATA]: true,
  [bucketNames.DOWNLOAD_STATUS_DATA]: true,
  [bucketNames.FAVORITES_DATA]: false,
  [bucketNames.MESSAGE_DATA]: false,
  [bucketNames.RESIDENT_DATA]: true,
  [bucketNames.USER_PROFILE_DATA]: false
};

const requiresDeviceUserSyncAdminDoc = [
  bucketNames.DOWNLOAD_STATUS_DATA,
  bucketNames.FAVORITES_DATA,
  bucketNames.MESSAGE_DATA
];

export class SyncAdminController {
  constructor(private service: SyncGatewayService) {}

  // Create bucket users and sync admin docs if needed
  updatePortalUserSyncAdmin(
    portalUser: PortalSyncAdmin
  ): Observable<SyncGatewayInterfaces.IUpdateResult[]> {
    console.log(portalUser);

    if (!PortalUserConstants.portalUserTypes.includes(portalUser.type)) {
      return Observable.of([]);
    }

    if (!portalUser.email) {
      throw new Error('Invalid email: ' + portalUser.email);
    }

    const username = encodeURIComponent(portalUser.email)
      .toLowerCase()
      .replace(/%/g, '_');
    portalUser._id = 'portal_sync_admin_' + username;
    portalUser.syncUsername = username;

    let docType = DocTypeConstants.DOC_TYPES.SYNC.PORTAL_SYNC_ADMIN;
    if (portalUser.type === PortalUserConstants.IN2L_ADMIN) {
      docType = DocTypeConstants.DOC_TYPES.SYNC.IN2L_ADMIN;
    } else if (portalUser.type === PortalUserConstants.ACCOUNT_ADMIN) {
      docType = DocTypeConstants.DOC_TYPES.SYNC.ACCOUNT_ADMIN;
    } else if (portalUser.type === PortalUserConstants.FACILITY_ADMIN) {
      docType = DocTypeConstants.DOC_TYPES.SYNC.FACILITY_ADMIN;
    }

    const observables = userTypeBuckets[portalUser.type].map(bucket => {
      const userObservable = this.service.updateUser(bucket, username);
      if (requiresPortalUserSyncAdminDoc[bucket]) {
        return userObservable.mergeMap((userResult: SyncGatewayInterfaces.IUpdateResult) => {
          portalUser.doc_type =
            bucket === bucketNames.ACCOUNT_DATA
              ? docType
              : DocTypeConstants.DOC_TYPES.SYNC.PORTAL_SYNC_ADMIN;
          return this.service
            .upsert(bucket, portalUser)
            .flatMap((syncAdminResult: PortalSyncAdmin) => {
              const ok =
                !!syncAdminResult &&
                syncAdminResult._id === portalUser._id &&
                !!syncAdminResult._rev;
              return Observable.of({
                id: syncAdminResult._id,
                rev: syncAdminResult._rev,
                ok: userResult.ok && ok
              });
            });
        });
      }

      return userObservable;
    });

    return Observable.forkJoin(observables);
  }

  // Create bucket users and sync admin docs if needed
  updateDeviceUserSyncAdmin(
    deviceSyncAdmin: DeviceSyncAdmin
  ): Observable<SyncGatewayInterfaces.IUpdateResult[]> {
    const syncAdminObservables = requiresDeviceUserSyncAdminDoc.map(bucket => {
      const syncAdmin: DeviceSyncAdmin = {
        _id: 'device_sync_admin_' + deviceSyncAdmin.serial_number,
        serial_number: deviceSyncAdmin.serial_number,
        device_id:
          bucket === bucketNames.DOWNLOAD_STATUS_DATA ? deviceSyncAdmin.device_id : undefined,
        account_id: bucket === bucketNames.MESSAGE_DATA ? deviceSyncAdmin.account_id : undefined,
        facility_id: bucket === bucketNames.MESSAGE_DATA ? deviceSyncAdmin.facility_id : undefined,
        resident_ids:
          bucket !== bucketNames.DOWNLOAD_STATUS_DATA ? deviceSyncAdmin.resident_ids : undefined,
        type: DocTypeConstants.DOC_TYPES.SYNC.DEVICE_SYNC_ADMIN
      };
      return this.service.upsert(bucket, syncAdmin).flatMap((result: DeviceSyncAdmin) => {
        console.log('\n');
        // console.log(result);

        const ok = result && !!result._rev;
        return Observable.of({
          id: result._id,
          ok
        });
      });
    });

    return Observable.forkJoin(...syncAdminObservables).mergeMap(results => {
      return Observable.of(results);
    });
  }

  deleteDeviceUserSyncAdmin(
    serialNumber: string
  ): Observable<SyncGatewayInterfaces.IUpdateResult[]> {
    if (!serialNumber) {
      throw new Error('Invalid device serial number');
    }

    const id = 'device_sync_admin_' + serialNumber;
    return Observable.forkJoin(
      requiresDeviceUserSyncAdminDoc.map(bucket => {
        return this.service
          .get(bucket, id)
          .mergeMap(doc =>
            doc && doc._rev
              ? this.service.delete(bucket, doc)
              : Observable.of({ id: 'device_sync_admin_' + serialNumber, ok: true })
          );
      })
    );
  }
}
