import * as _ from 'lodash';
import { v4 as uuidv4 } from 'uuid/v4';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { bucketNames, PortalUserConstants } from '../constants';
import { CouchbaseAnalyticsService, SyncGatewayService } from '../services';
import { SyncGatewayInterfaces } from '../models';

export class SyncGatewayController {
  constructor(
    private couchbaseAnalyticsService: CouchbaseAnalyticsService,
    private syncGatewayService: SyncGatewayService
  ) { }

  getDocsByNamespace(
    namespace: string,
    userType: string,
    userAccountId?: string,
    userFacilityIds?: string[]
  ): Observable<any[]> {
    return this.couchbaseAnalyticsService
      .getDocIdsByNamespace(namespace, userType, userAccountId, userFacilityIds)
      .mergeMap((ids: string[]) => {
        return this.syncGatewayService.getAllByKeys(bucketNames.ACCOUNT_DATA, ids);
      });
  }

  getDocsByNamespaceType(
    namespace: string,
    type: string,
    userType: string,
    userAccountId?: string,
    userFacilityIds?: string[]
  ): Observable<any[]> {
    return this.couchbaseAnalyticsService
      .getDocIdsByNamespaceType(namespace, type, userType, userAccountId, userFacilityIds)
      .mergeMap((ids: string[]) =>
        this.syncGatewayService.getAllByKeys(bucketNames.ACCOUNT_DATA, ids)
      );
  }

  getDoc(
    namespace: string,
    type: string,
    id: string
  ): Observable<SyncGatewayInterfaces.ISyncGatewayDocument> {
    return this.syncGatewayService.get(bucketNames.ACCOUNT_DATA, id).mergeMap(doc => {
      if (doc.doc_type !== `${namespace}_${type}`) {
        return Observable.of(null);
      }

      return Observable.of(doc);
    });
  }

  postDoc(
    doc: SyncGatewayInterfaces.ISyncGatewayDocument
  ): Observable<SyncGatewayInterfaces.ISyncGatewayDocument> {
    const newDoc = Object.assign({}, doc, { _id: uuidv4() });
    return this.syncGatewayService.update(bucketNames.ACCOUNT_DATA, newDoc);
  }

  putDoc(
    doc: SyncGatewayInterfaces.ISyncGatewayDocument
  ): Observable<SyncGatewayInterfaces.ISyncGatewayDocument> {
    return this.syncGatewayService.update(bucketNames.ACCOUNT_DATA, doc);
  }

  deleteDoc(doc: any): Observable<any> {
    return this.syncGatewayService.delete(bucketNames.ACCOUNT_DATA, doc);
  }
}
