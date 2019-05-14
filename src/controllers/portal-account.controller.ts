import * as _ from 'lodash';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid/v4';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { bucketNames, DocTypeConstants } from '../constants';
import { PortalAccountInterfaces as PAI } from '../models';
import { SyncGatewayService } from '../services/sync-gateway.service';

export class PortalAccountController {
  private service: SyncGatewayService;

  constructor(syncGatewayService: SyncGatewayService) {
    this.service = syncGatewayService;
  }

  createAccount(account: PAI.Account): Observable<PAI.Account> {
    account._id = account._id || uuidv4();
    account.doc_type = DocTypeConstants.DOC_TYPES.ACCOUNT.ACCOUNT;
    const username = account._id.replace(/[^0-9a-zA-Z]/g, '');

    return this.service
      .updateUser(bucketNames.USER_PROFILE_DATA, username)
      .mergeMap(userResult => {
        console.log(userResult);
        return this.service.update(bucketNames.ACCOUNT_DATA, account);
      })
      .mergeMap(accountResult => {
        console.log(accountResult);
        return Observable.of(accountResult);
      });
  }
}
