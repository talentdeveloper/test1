import * as _ from 'lodash';
import * as moment from 'moment';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import { RxHR, RxHttpRequest } from '@akanass/rx-http-request';

import { ConfigInterfaces, DashboardInterfaces as DI } from '../models';
import { CouchbaseAnalyticsQueries, DocTypeConstants, PortalUserConstants } from '../constants';

export class CouchbaseAnalyticsService {
  private config: ConfigInterfaces.IConfig;
  private baseSgRequest: RxHttpRequest;
  private url: string;

  constructor(config: ConfigInterfaces.IConfig) {
    this.config = config;

    const cbAuth =
      'Basic ' +
      new Buffer(
        config.couchbaseAnalytics.user + ':' + config.couchbaseAnalytics.password
      ).toString('base64');
    this.baseSgRequest = RxHR.defaults({ headers: { Authorization: cbAuth } });

    this.url = `${this.config.couchbaseAnalytics.url}/analytics/service`;
  }

  /**
   * Sync Gateway Pass-thru Document Queries
   */
  getDocIdsByNamespace(
    namespace: string,
    userType: string,
    userAccountId: string = '',
    userFacilityIds: string[] = []
  ): Observable<string[]> {
    return this.docTypeQuery(namespace, null, userType, userAccountId, userFacilityIds);
  }

  getDocIdsByNamespaceType(
    namespace: string,
    type: string,
    userType: string,
    userAccountId: string = '',
    userFacilityIds: string[] = []
  ): Observable<string[]> {
    return this.docTypeQuery(namespace, type, userType, userAccountId, userFacilityIds);
  }

  /**
   * Dashboard queries
   */

  getUsageFirstYear(id: string): Observable<number[]> {
    const queryStatement = CouchbaseAnalyticsQueries.DASHBOARD_FIRST_YEAR;
    const options = {
      'Content-Type': 'application/x-www-form-urlencoded',
      form: {
        statement: queryStatement,
        $ID: `"${id}"`
      }
    };

    return this.baseSgRequest.post(this.url, options).mergeMap(data => {
      let body;
      try {
        body = JSON.parse(data.body);
      } catch (e1) {
        body = { errors: ['Could not parse response body'] };
      }

      if (data.response.statusCode !== 200 || body.status !== 'success') {
        try {
          const errorMessages = body.errors.join('\n');
          throw new Error('Usage first year query request failed. Errors: ' + errorMessages);
        } catch (e) {
          throw new Error('Usage first year query request failed.');
        }
      }

      return Observable.of(body.results.filter(val => !!val) || []);
    });
  }

  getUsageProducts(id: string): Observable<{ product: string; total: number }[]> {
    const queryStatement = CouchbaseAnalyticsQueries.DASHBOARD_PRODUCTS;
    const options = {
      'Content-Type': 'application/x-www-form-urlencoded',
      form: {
        statement: queryStatement,
        $ID: `"${id}"`
      }
    };

    return this.baseSgRequest.post(this.url, options).mergeMap(data => {
      let body;
      try {
        body = JSON.parse(data.body);
      } catch (e1) {
        body = { errors: ['Could not parse response body'] };
      }

      if (data.response.statusCode !== 200 || body.status !== 'success') {
        try {
          const errorMessages = body.errors.join('\n');
          throw new Error('Usage products query request failed. Errors: ' + errorMessages);
        } catch (e) {
          throw new Error('Usage products query request failed.');
        }
      }

      return Observable.of(body.results.filter(val => !!val) || []);
    });
  }

  getFacilitySyncOnline(facilityId: string): Observable<any> {
    const queryStatement = CouchbaseAnalyticsQueries.FACILITY_DASHBOARD_DEVICE_SINC_ONLINE;
    const options = {
      'Content-Type': 'application/x-www-form-urlencoded',
      form: {
        statement: queryStatement,
        $FACILITY_ID: `"${facilityId}"`
      }
    };

    return this.baseSgRequest.post(this.url, options).mergeMap(data => {
      let body;
      try {
        body = JSON.parse(data.body);
      } catch (e1) {
        body = { errors: ['Could not parse response body'] };
      }

      if (data.response.statusCode !== 200 || body.status !== 'success') {
        try {
          const errorMessages = body.errors.join('\n');
          throw new Error(
            'Facility sync and online status query request failed. Errors: ' + errorMessages
          );
        } catch (e) {
          throw new Error('Facility sync and online status query request failed.');
        }
      }

      return Observable.of(body.results || []);
    });
  }

  private docTypeQuery(
    namespace: string,
    type: string,
    userType: string,
    userAccountId: string = '',
    userFacilityIds: string[] = []
  ): Observable<string[]> {
    let options: {
      'Content-Type': string;
      form: {
        statement: string;
        $DOC_TYPE: string;
        $ACCOUNT_ID?: string;
        $FACILITY_IDS?: string;
      };
    };

    if (
      [DocTypeConstants.DOC_NAMESPACES.ACCOUNT, DocTypeConstants.DOC_NAMESPACES.CONTENT].includes(
        namespace
      )
    ) {
      options = {
        'Content-Type': 'application/x-www-form-urlencoded',
        form: {
          statement: null,
          $DOC_TYPE: `"${namespace}_${type ? type : '%'}"`
        }
      };

      if (
        userType === PortalUserConstants.IN2L_ADMIN ||
        userType === PortalUserConstants.IN2L_CONTENT
      ) {
        options.form.statement = CouchbaseAnalyticsQueries.ID_BY_DOC_TYPE;
      } else if (userType === PortalUserConstants.ACCOUNT_ADMIN) {
        options.form.statement = CouchbaseAnalyticsQueries.ID_BY_DOC_TYPE_ACCOUNT;
        options.form.$ACCOUNT_ID = `"${userAccountId}"`;
      } else if (userType === PortalUserConstants.FACILITY_ADMIN) {
        options.form.statement = CouchbaseAnalyticsQueries.ID_BY_DOC_TYPE_ACCOUNT_FACILITIES;
        options.form.$ACCOUNT_ID = `"${userAccountId}"`;
        options.form.$FACILITY_IDS = `["${userFacilityIds.join('","')}"]`;
      }
    }

    if (!options.form.statement) {
      return Observable.of([]);
    }

    options.form.statement = options.form.statement.trim();

    if (!!type && !DocTypeConstants.isValidDocType(`${namespace}_${type}`)) {
      throw new Error('Invalid doc type namespace or type');
    }

    return this.baseSgRequest.post(this.url, options).mergeMap(data => {
      let body;
      try {
        body = JSON.parse(data.body);
      } catch (e1) {
        body = { errors: ['Could not parse response body'] };
      }

      if (data.response.statusCode !== 200 || body.status !== 'success') {
        try {
          const errorMessages = body.errors.join('\n');
          throw new Error('Namespce query request failed. Errors: ' + errorMessages);
        } catch (e) {
          throw new Error('Namspace query request failed.');
        }
      }

      return Observable.of(body.results);
    });
  }

  /**
   * Dashboard Queries
   */

  getFacilityResidentDeviceAverageUsageById(
    facilityId: string,
    product: string,
    dateRangeStart: moment.Moment,
    dateRangeEnd: moment.Moment
  ): Observable<DI.IFacilityResidentDeviceUsage> {
    const queryStatement =
      product === 'all'
        ? CouchbaseAnalyticsQueries.FACILITY_DASHBOARD_DEVICE_RESIDENT_USAGE_ALL
        : product === 'engage'
        ? CouchbaseAnalyticsQueries.FACILITY_DASHBOARD_DEVICE_RESIDENT_USAGE_APOLLO
        : CouchbaseAnalyticsQueries.FACILITY_DASHBOARD_DEVICE_RESIDENT_USAGE_FOCUS;
    const options = {
      'Content-Type': 'application/x-www-form-urlencoded',
      form: {
        statement: queryStatement,
        $FACILITY_ID: `"${facilityId}"`,
        $RANGE_START_DATE: `"${dateRangeStart.format('YYYY-MM-DD')}"`,
        $RANGE_END_DATE: `"${dateRangeEnd.format('YYYY-MM-DD')}"`
      }
    };

    return this.baseSgRequest.post(this.url, options).mergeMap(data => {
      let body;
      try {
        body = JSON.parse(data.body);
      } catch (e1) {
        body = { errors: ['Could not parse response body'] };
      }

      if (data.response.statusCode !== 200 || body.status !== 'success') {
        try {
          const errorMessages = body.errors.join('\n');
          throw new Error(
            'Facility resident and device usage query request failed. Errors: ' + errorMessages
          );
        } catch (e) {
          throw new Error('Facility resident and device usage query request failed.');
        }
      }

      const idMap = body.results.reduce((result, item) => {
        result[item.id] = item.average_usage;
        return result;
      }, {});
      return Observable.of(idMap);
    });
  }

  getDateStringLengthFromGroupBy(groupBy: string): number {
    if (groupBy === 'hour') {
      // 2018-01-01T05
      return 13;
    }

    if (groupBy === 'day') {
      // 2018-01-01
      return 10;
    }

    if (groupBy === 'month') {
      // 2018-01
      return 7;
    }

    // 2018
    return 4;
  }
}
