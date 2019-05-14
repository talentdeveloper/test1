import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import { RxHR, RxHttpRequest, RxHttpRequestResponse, CoreOptions } from '@akanass/rx-http-request';

import { ViewStates } from '../constants';
import { ConfigInterfaces, MessageInterfaces, SyncGatewayInterfaces } from '../models';

export class SyncGatewayService {
  private config: ConfigInterfaces.IConfig;
  private baseSgRequest: RxHttpRequest;

  constructor(config: ConfigInterfaces.IConfig) {
    this.config = config;

    const sgAuth =
      'Basic ' +
      new Buffer(config.syncGateway.user + ':' + config.syncGateway.password).toString('base64');
    this.baseSgRequest = RxHR.defaults({ headers: { Authorization: sgAuth } });
  }

  get(bucket: string, id: string): Observable<any> {
    const url = `${this.config.syncGateway.url}/${bucket}/${encodeURIComponent(id)}`;
    return this.baseSgRequest.get(url).mergeMap(data => {
      if (data.response.statusCode === 404) {
        return Observable.of(null);
      }

      if (data.response.statusCode !== 200) {
        return Observable.throw(new Error(JSON.parse(data.body)));
      }

      return Observable.of(JSON.parse(data.body));
    });
  }

  getAll(bucket: string): Observable<any[]> {
    return this.baseSgRequest
      .get(`${this.config.syncGateway.url}/${bucket}/_all_docs?include_docs=true`)
      .mergeMap(data => {
        let docs = JSON.parse(data.body).rows.map(doc => doc.doc);
        return Observable.of(docs);
      });
  }

  getAllByKeys(bucket: string, keys: string[]): Observable<any[]> {
    if (!keys || !keys.length) {
      return Observable.of([]);
    }

    const fullUrl = `${
      this.config.syncGateway.url
      }/${bucket}/_all_docs?include_docs=true&keys=[${keys.map(k => `"${k}"`)}]`;

    if (fullUrl.length <= 2084) {
      return this.baseSgRequest.get(fullUrl).mergeMap(data => {
        let docs = JSON.parse(data.body).rows.map(doc => doc.doc);
        return Observable.of(docs);
      });
    }

    return Observable.forkJoin([
      this.getAllByKeys(bucket, keys.slice(0, Math.floor(keys.length / 2))),
      this.getAllByKeys(bucket, keys.slice(Math.floor(keys.length / 2)))
    ]).mergeMap(([first, second]: any[]) => {
      return Observable.of((first || []).concat(second || []));
    });
  }

  getUser(bucket: string, username: string): Observable<any> {
    const url = `${this.config.syncGateway.url}/${bucket}/_user/${encodeURIComponent(username)}`;
    // console.log(url);
    return this.baseSgRequest.get(url).mergeMap(data => Observable.of(JSON.parse(data.body)));
  }

  getView(
    bucket: string,
    viewName: string,
    queryParams?: SyncGatewayInterfaces.IViewQueryParams
  ): Observable<SyncGatewayInterfaces.IViewResult<any>[]> {
    queryParams = _.assign({ stale: ViewStates.STALE_FALSE }, queryParams || {});

    const host = `${this.config.syncGateway.url}/${bucket}/_design/${viewName}`;
    const queryString =
      '?' +
      Object.keys(queryParams)
        .reduce((prev, k) => {
          let key = k.toLowerCase();
          let value;
          if (key === 'key' && queryParams[key]) {
            if (typeof queryParams[key] === 'string') {
              value = `${queryParams[key]}`;
              if (value[0] !== '"') {
                value = '"' + value;
              }
              if (value[value.length - 1] !== '"') {
                value += '"';
              }
            } else if (_.isArray(queryParams[key])) {
              value = this.stringifyStringArray(queryParams[key]);
            }
          } else if (
            key === 'keys' ||
            key === 'startkey' ||
            key === 'endkey' ||
            key === 'endkeyexact'
          ) {
            const valuesAreArrays = _.isArray(queryParams[key][0]);
            if (valuesAreArrays) {
              const stringArray = queryParams[key].map(key => this.stringifyStringArray(key));
              value = '[' + stringArray.join(',') + ']';
            } else {
              value = this.stringifyStringArray(queryParams[key], key === 'endkey');
            }
          } else {
            value = queryParams[key];
          }
          key = key === 'endkeyexact' ? 'endkey' : key;
          prev.push(key + '=' + value);

          return prev;
        }, [])
        .join('&');

    console.log('\n\n' + host + queryString + '\n\n');
    const url = encodeURI(host + queryString);
    if (url.length > 2083 && queryParams.keys && queryParams.keys.length) {
      const splitAt = Math.floor(queryParams.keys.length / 2);
      const params1 = Object.assign({}, queryParams, { keys: queryParams.keys.slice(0, splitAt) });
      const params2 = Object.assign({}, queryParams, { keys: queryParams.keys.slice(splitAt) });
      return Observable.forkJoin([
        this.getView(bucket, viewName, params1),
        this.getView(bucket, viewName, params2)
      ]).mergeMap(([first, second]) => {
        return Observable.of((first || []).concat(second || []));
      });
    }

    if (!queryParams.keys) {
      // console.log('\nSyncGatewayService.getView URL: ' + url + '\n');
    }

    return this.baseSgRequest.get(url).mergeMap(data => {
      let docs = JSON.parse(data.body).rows;
      return Observable.of(docs);
    });
  }
  getMessageChanges(
    contactEmail: string,
    sequenceId: string
  ): Observable<MessageInterfaces.IMessageChange[]> {
    const url = `${
      this.config.syncGateway.url
      }/message_data/_changes?since=${sequenceId}&active_only=1&include_docs=true`;
    return this.baseSgRequest
      .get(url)
      .mergeMap(data =>
        Observable.of(
          JSON.parse(data.body).results.filter(entry => entry.doc.contact_email === contactEmail)
        )
      );
  }

  getAttachment(bucket: string, id: string, attachmentName: string): Observable<string> {
    const url = `${this.config.syncGateway.url}/${bucket}/${id}/${attachmentName}`;
    return this.baseSgRequest
      .get(url, {
        encoding: null
      })
      .mergeMap(data => {
        console.log(
          'SyncGatewayService.get GET ' + url + ' - statusCode: ' + data.response.statusCode
        );

        if (data.response.statusCode === 404) {
          return Observable.of(null);
        }

        if (data.response.statusCode !== 200) {
          return Observable.throw(new Error(JSON.parse(data.body)));
        }

        return Observable.of(data.body);
      });
  }

  upsert(bucket: string, doc: any): Observable<any> {
    return this.get(bucket, doc._id).mergeMap(item => {
      const newDoc = Object.assign({}, doc);

      if (item && item._rev) {
        newDoc._rev = item._rev;
      }

      return this.update(bucket, newDoc);
    });
  }

  update<T>(bucket: string, doc: any): Observable<T> {
    const url =
      `${this.config.syncGateway.url}/${bucket}/${encodeURIComponent(doc._id)}` +
      (doc._rev ? `?rev=${doc._rev}` : '');

    const options = {
      'content-type': 'application/json',
      body: JSON.stringify(doc)
    };

    return this.baseSgRequest.put(url, options).mergeMap(data => {
      const result = JSON.parse(data.body);
      if (!result.ok) {
        throw new Error(
          `Unable to update document. Error: ${result.error}. Reason: ${result.reason}`
        );
      }

      doc._rev = result.rev;

      return Observable.of(doc);
    });
  }

  updateDocs(bucket: string, docs: any[]): Observable<any[]> {
    const updateObservables = docs.map(doc => this.update(bucket, doc));
    return Observable.forkJoin(...updateObservables);
  }

  bulkUpdate(bucket: string, docs: any[]): Observable<SyncGatewayInterfaces.IBulkUpdateResult[]> {
    if (!docs.length) {
      return Observable.of([]);
    }

    if (JSON.stringify(docs).length > 2 * 1024 * 1024) {
      const maxCount = Math.floor(docs.length / 2);
      const first = docs.slice(0, maxCount);
      const second = docs.slice(maxCount);
      return Observable.forkJoin([
        this.bulkUpdate(bucket, first),
        this.bulkUpdate(bucket, second)
      ]).mergeMap(
        ([first, second]: [
          SyncGatewayInterfaces.IBulkUpdateResult[],
          SyncGatewayInterfaces.IBulkUpdateResult[]
        ]) => {
          if (_.isArray(first) && _.isArray(second)) {
            return Observable.of(first.concat(second));
          }

          if (!_.isArray(first)) {
            throw 'Unexpected bulk update first results';
          }

          throw 'Unexpected bulk update second results';
        }
      );
    }

    const url = `${this.config.syncGateway.url}/${bucket}/_bulk_docs`;
    console.log(`Bulk update for ${docs.length} docs - ${url}`);

    const options = {
      'content-type': 'application/json',
      body: JSON.stringify({ docs: docs })
    };

    return this.baseSgRequest.post(url, options).mergeMap((data: RxHttpRequestResponse) => {
      const results = JSON.parse(data.body);

      return Observable.of(results);
    });
  }

  updateUser(
    bucket: string,
    username: string,
    password: string = 'in2luser'
  ): Observable<SyncGatewayInterfaces.IUpdateResult> {
    if (!username) {
      throw new Error('Invalid username');
    }

    const url = `${this.config.syncGateway.url}/${bucket}/_user/${encodeURIComponent(username)}`;
    const body = {
      name: username,
      password: password
    };

    const base64Creds = new Buffer(
      `${this.config.syncGateway.user}:${this.config.syncGateway.password}`
    ).toString('base64');
    const options = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64Creds}`
      },
      body: JSON.stringify(body)
    };

    return this.baseSgRequest.put(url, options).mergeMap((data: RxHttpRequestResponse) => {
      console.log(
        'SyncGatewayService.updateUser PUT ' + url + ' - statusCode: ' + data.response.statusCode
      );
      return Observable.of({
        id: username,
        rev: '',
        ok: data.response.statusCode === 200 || data.response.statusCode === 201
      });
    });
  }

  updateAttachment(
    bucket: string,
    id: string,
    rev: string,
    attachmentName: string,
    contentType: string,
    data: any
  ): Observable<SyncGatewayInterfaces.IUpdateResult> {
    if (!data) {
      throw new Error('Invalid attachment data');
    }

    const url = `${this.config.syncGateway.url}/${bucket}/${id}/${attachmentName}?rev=${rev}`;
    const options: CoreOptions = {
      headers: {
        'Content-Type': contentType
      },
      body: data,
      encoding: null
    };

    return this.baseSgRequest
      .put<SyncGatewayInterfaces.IUpdateResult>(url, options)
      .mergeMap((data: RxHttpRequestResponse) => {
        console.log(
          'SyncGatewayService.updateAttachment PUT ' +
          url +
          ' - statusCode: ' +
          data.response.statusCode +
          ' - ' +
          typeof data.body
        );
        return Observable.of(JSON.parse(data.body));
      });
  }

  delete(bucket: string, doc: any) {
    const url =
      `${this.config.syncGateway.url}/${bucket}/${encodeURIComponent(doc._id)}` +
      (doc._rev ? `?rev=${doc._rev}` : '');
    return this.baseSgRequest.delete(url).mergeMap(data => Observable.of(JSON.parse(data.body)));
  }

  deleteDocs(bucket: string, docs: any[]) {
    const deleteObservables = docs.map(doc => this.delete(bucket, doc));
    return Observable.forkJoin(...deleteObservables);
  }

  private stringifyStringArray(stringArray: string[], isEndKey: boolean = false): string {
    if (typeof stringArray === 'string') {
      return stringArray;
    }

    return '["' + stringArray.join('","') + (isEndKey ? '",{}]' : '"]');
  }
}
