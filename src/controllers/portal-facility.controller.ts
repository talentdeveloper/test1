import * as _ from 'lodash';
import * as moment from 'moment';
import { uuidv4 } from 'uuid/v4';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { bucketNames, DocTypeConstants } from '../constants';
import { AuthenticationInterfaces, PortalFacilityInterfaces as PFI } from '../models';
import { SyncGatewayService } from '../services/sync-gateway.service';

export class PortalFacilityController {
  private service: SyncGatewayService;

  constructor(syncGatewayService: SyncGatewayService) {
    this.service = syncGatewayService;
  }

  createFacility(facility: PFI.Facility): Observable<PFI.Facility> {
    facility._id = facility._id || uuidv4();
    facility.doc_type = DocTypeConstants.DOC_TYPES.ACCOUNT.FACILITY;
    const username = facility._id.replace(/[^0-9a-zA-Z]/g, '');

    return this.service
      .updateUser(bucketNames.USER_PROFILE_DATA, username)
      .mergeMap(userResult => {
        console.log(userResult);
        return this.service.update(bucketNames.ACCOUNT_DATA, facility);
      })
      .mergeMap(facilityResult => {
        console.log(facilityResult);
        return Observable.of(facilityResult);
      });
  }
}
