import * as _ from 'lodash';
import * as moment from 'moment';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import {
  ApolloContentDisplayTypes,
  analyticsKeyNames,
  bucketNames,
  productNames,
  viewNames,
  ViewStates
} from '../constants';
import { DashboardInterfaces as DI, SyncGatewayInterfaces } from '../models';
import { CouchbaseAnalyticsService, SyncGatewayService } from '../services';

export class DashboardController {
  constructor(
    private couchbaseAnalyticsService: CouchbaseAnalyticsService,
    private service: SyncGatewayService
  ) {}

  getFirstYear(params: DI.IDashboardParams): Observable<number> {
    return this.couchbaseAnalyticsService
      .getUsageFirstYear(params.id)
      .mergeMap((result: number[]) => {
        if (!result || !result.length) {
          return Observable.of(moment().year());
        }

        return Observable.of(Number(result[0]));
      });
  }

  getProducts(params: DI.IDashboardParams): Observable<DI.IProductData> {
    return this.couchbaseAnalyticsService
      .getUsageProducts(params.id)
      .mergeMap((results: { product: string; total: number }[]) => {
        const products = {
          hasApolloData: false,
          hasEngageData: false,
          hasFocusData: false,
          hasRehabData: false
        };

        if (!results || !results.length) {
          return Observable.of(products);
        }

        results.forEach(item => {
          if (item.product === productNames.apollo && (item.total || 0) > 0) {
            products.hasApolloData = true;
          }

          if (item.product === productNames.focus && (item.total || 0) > 0) {
            products.hasFocusData = true;
          }

          if (
            [productNames.apollo, productNames.engage].includes(item.product) &&
            (item.total || 0) > 0
          ) {
            products.hasEngageData = true;
          }

          if (item.product === productNames.rehab && (item.total || 0) > 0) {
            products.hasRehabData = true;
          }
        });

        return Observable.of(products);
      });
  }

  getDrillDownChartData(params: DI.IDashboardParams): Observable<DI.IChartData> {
    // console.log('getDrillDownChartData');
    // console.log('getDrillDownChartData');
    const { startKey, endKey, dateGroupLevel } = this.buildDateParameters(params);

    const keyFormatter = this.chartKeyFormatter(params.for);

    const options = {
      startkey: [params.id, params.product].concat(startKey),
      endkey: [params.id, params.product].concat(endKey),
      group_level: dateGroupLevel + 3,
      inclusive_end: true,
      reduce: true
    };

    // console.log('options: ' + JSON.stringify(options));
    return this.service
      .getView(bucketNames.ANALYTICS_DATA, viewNames.SINGLE_KEY_USAGE_BY_HOUR, {
        startkey: [params.id, params.product].concat(startKey),
        endkey: [params.id, params.product].concat(endKey),
        group_level: dateGroupLevel + 3,
        inclusive_end: true,
        reduce: true
      })
      .mergeMap((results: SyncGatewayInterfaces.IViewResult<number>[]) => {
        // console.log(results);
        const chartEntries = this.addEmptyChartEntries(results || [], params, 2);
        const values = chartEntries.map(item => {
          const dateKey = item.key.slice(2, dateGroupLevel + 3);
          const entry: [string, number] = [keyFormatter(dateKey), item.value / 3600];
          return entry;
        });

        return Observable.of({ data: values });
      });
  }

  // Used for the Account dashboard: facilities device and residents with usage report
  getFacilityDevicesResidentsWithUsage(
    params: DI.IDashboardParams
  ): Observable<DI.IFacilityDeviceResidentWithUsage[]> {
    const { startKey, endKey, dateGroupLevel } = this.buildDateParameters(params);

    return this.service
      .getView(bucketNames.ACCOUNT_DATA, viewNames.ACCOUNT_FACILITIES, {
        startkey: [params.id],
        endkey: [params.id]
      })
      .mergeMap((results: SyncGatewayInterfaces.IViewResult<[string[], string]>[]) => {
        console.log('getFacilityDevicesResidentsWithUsage');
        console.log(results);
        const facilityIds = results.map(row => row.key[1]).filter(id => !!id);

        if (!facilityIds.length) {
          return Observable.of([]);
        }

        const facilityObservables = facilityIds.map(facilityId =>
          this.getFacilityActiveDeviceIdsAndResidentIds(
            facilityId,
            params.product,
            startKey,
            endKey,
            dateGroupLevel
          )
        );

        return Observable.forkJoin(facilityObservables);
      });
  }

  getFacilitySyncOnline(facilityId: string): Observable<any> {
    return this.couchbaseAnalyticsService.getFacilitySyncOnline(facilityId);
  }

  getAccountTotalUsageByFacility(
    params: DI.IDashboardParams
  ): Observable<DI.IFacilitiesTotalUsage> {
    const { startKey, endKey, dateGroupLevel } = this.buildDateParameters(params);

    return this.service
      .getView(bucketNames.ANALYTICS_DATA, viewNames.ACCOUNT_FACILITY_USAGE_BY_HOUR, {
        startkey: [params.id, params.product].concat(startKey),
        endkey: [params.id, params.product].concat(endKey),
        group_level: dateGroupLevel + 2,
        reduce: true,
        inclusive_end: true,
        stale: ViewStates.STALE_OK
      })
      .mergeMap((results: SyncGatewayInterfaces.IViewResult<DI.IFacilitiesTotalUsage>[]) => {
        if (!results || !results.length) {
          return Observable.of({});
        }

        Object.keys(results[0].value).forEach(key => (results[0].value[key] /= 3600));
        return Observable.of(results[0].value);
      });
  }

  // Used in the Facility dashboard: usage values for each device in the facility
  // to be used in the Device Usage Report
  getFacilityDeviceUsage(params: DI.IDashboardParams): Observable<DI.IFacilityResidentDeviceUsage> {
    const { startKey, endKey, dateGroupLevel } = this.buildDateParameters(params);

    return this.getFacilityActiveDeviceIds(
      params.facilityId || params.id,
      params.product,
      startKey,
      endKey,
      dateGroupLevel
    ).mergeMap((deviceIds: string[]) => {
      if (!deviceIds.length) {
        return Observable.of({});
      }

      const deviceIdsObservables = deviceIds.map(deviceId =>
        this.service
          .getView(bucketNames.ANALYTICS_DATA, viewNames.FACILITY_DEVICE_USAGE_BY_HOUR, {
            startkey: [params.id, deviceId, params.product].concat(startKey),
            endkey: [params.id, deviceId, params.product].concat(endKey),
            group_level: dateGroupLevel + 3,
            reduce: true,
            inclusive_end: true
          })
          .mergeMap((result: SyncGatewayInterfaces.IViewResult<number>[]) => {
            return Observable.of({
              [deviceId]: result && result.length && result[0].value ? result[0].value : 0
            });
          })
      );
      return Observable.forkJoin(deviceIdsObservables).mergeMap(
        (results: { [deviceId: string]: number }[]) => {
          const output = results.reduce((mergedResults, item) => {
            const key = item && Object.keys(item).length ? Object.keys(item)[0] : null;
            if (key) {
              mergedResults[key] = item[key] / 3600;
            }
            return mergedResults;
          }, {});
          return Observable.of(output);
        }
      );
    });
  }

  // Facility dashboard: usage values for each resident in the facility
  // to be used in the Resident Usage Report
  getFacilityResidentUsage(
    params: DI.IDashboardParams
  ): Observable<DI.IFacilityResidentDeviceUsage> {
    const { startKey, endKey, dateGroupLevel } = this.buildDateParameters(params);

    return this.getFacilityActiveResidentIds(
      params.facilityId || params.id,
      params.product,
      startKey,
      endKey,
      dateGroupLevel
    ).mergeMap((residentIds: string[]) => {
      if (!residentIds.length) {
        return Observable.of({});
      }

      const residentIdsObservables = residentIds.map(residentId =>
        this.service
          .getView(bucketNames.ANALYTICS_DATA, viewNames.FACILITY_RESIDENT_USAGE_BY_HOUR, {
            startkey: [params.id, residentId, params.product].concat(startKey),
            endkey: [params.id, residentId, params.product].concat(endKey),
            group_level: dateGroupLevel + 3,
            reduce: true,
            inclusive_end: true
          })
          .mergeMap((result: SyncGatewayInterfaces.IViewResult<number>[]) => {
            return Observable.of({
              [residentId]: result && result.length && result[0].value ? result[0].value : 0
            });
          })
      );
      return Observable.forkJoin(residentIdsObservables).mergeMap(
        (results: { [residentId: string]: number }[]) => {
          const output = results.reduce((mergedResults, item) => {
            const key = item && Object.keys(item).length ? Object.keys(item)[0] : null;
            if (key) {
              mergedResults[key] = item[key] / 3600;
            }
            return mergedResults;
          }, {});
          return Observable.of(output);
        }
      );
    });
  }

  getResidentQuickUsage(params: DI.IDashboardParams): Observable<DI.IResidentQuickUsage> {
    // console.log('\n\ngetResidentQuickUsage Called\n\n');
    const endDate = moment().subtract(1, 'hour');
    const midDate = moment(endDate).subtract(7, 'days');
    const startDate = moment(midDate).subtract(7, 'days');

    const startKey = [
      params.id,
      'all',
      startDate.year().toString(),
      _.padStart(startDate.month().toString(), 2, '0'),
      _.padStart(startDate.date().toString(), 2, '0'),
      _.padStart(startDate.hour().toString(), 2, '0')
    ];
    const midKey = [
      params.id,
      'all',
      midDate.year().toString(),
      _.padStart(midDate.month().toString(), 2, '0'),
      _.padStart(midDate.date().toString(), 2, '0'),
      _.padStart(midDate.hour().toString(), 2, '0')
    ];
    const endKey = [
      params.id,
      'all',
      endDate.year().toString(),
      _.padStart(endDate.month().toString(), 2, '0'),
      _.padStart(endDate.date().toString(), 2, '0'),
      _.padStart(endDate.hour().toString(), 2, '0')
    ];

    const lastWeekObservable = this.service.getView(
      bucketNames.ANALYTICS_DATA,
      viewNames.SINGLE_KEY_USAGE_BY_HOUR,
      {
        startkey: startKey,
        endkey: midKey,
        group_level: 1,
        reduce: true,
        inclusive_end: true
      }
    );

    const thisWeekObservable = this.service.getView(
      bucketNames.ANALYTICS_DATA,
      viewNames.SINGLE_KEY_USAGE_BY_HOUR,
      {
        startkey: midKey,
        endkey: endKey,
        group_level: 1,
        reduce: true,
        inclusive_end: true
      }
    );

    return Observable.forkJoin(lastWeekObservable, thisWeekObservable).mergeMap(
      ([lastWeek, thisWeek]: [
        SyncGatewayInterfaces.IViewResult<number>[],
        SyncGatewayInterfaces.IViewResult<number>[]
      ]) => {
        const lastWeekUsage =
          lastWeek && lastWeek.length && lastWeek[0].value ? lastWeek[0].value / 3600 : 0;
        const thisWeekUsage =
          thisWeek && thisWeek.length && thisWeek[0].value ? thisWeek[0].value / 3600 : 0;
        const averageDailyUsage = (lastWeekUsage + thisWeekUsage) / 14;

        return Observable.of({
          lastWeekUsage,
          thisWeekUsage,
          averageDailyUsage
        });
      }
    );
  }

  getContentPieChartData(params: DI.IDashboardParams): Observable<DI.IContentPieChart> {
    return this.getContentViewData(params).mergeMap(
      (contentViewData: {
        contentItems: SyncGatewayInterfaces.IViewResult<DI.IContentInfo>[];
        contentAccessed: SyncGatewayInterfaces.IViewResult<number>[];
      }) => {
        const contentMap = contentViewData.contentItems.reduce(
          (
            result: { [id: string]: DI.IContentInfo },
            item: SyncGatewayInterfaces.IViewResult<DI.IContentInfo>
          ) => {
            result[item.id] = item.value;
            return result;
          },
          {}
        );

        const resultsMap = contentViewData.contentAccessed.reduce((result, item) => {
          const contentId = item.key[item.key.length - 1];
          const isApollo = !contentMap[contentId];
          const displayType = isApollo
            ? ApolloContentDisplayTypes[contentId] || ''
            : contentMap[contentId].display_type;
          if (!displayType) {
            return result;
          }
          result[displayType] = (result[displayType] || 0) + item.value;
          return result;
        }, {});

        const results: { label: string; data: number }[] = Object.keys(resultsMap)
          .map(
            (key: string): { label: string; data: number } => ({
              label: key,
              data: resultsMap[key]
            })
          )
          .sort((a, b) => {
            if (a.data !== b.data) {
              return b.data - a.data;
            }

            return b.label.localeCompare(a.label);
          });

        return Observable.of({ data: results });
      }
    );
  }

  getContentReportData(params: DI.IDashboardParams): Observable<DI.IContentReport> {
    return this.getContentViewData(params).mergeMap(
      (contentViewData: {
        contentItems: SyncGatewayInterfaces.IViewResult<DI.IContentInfo>[];
        contentAccessed: SyncGatewayInterfaces.IViewResult<number>[];
      }) => {
        const contentMap = contentViewData.contentItems.reduce(
          (
            result: { [id: string]: DI.IContentInfo },
            item: SyncGatewayInterfaces.IViewResult<DI.IContentInfo>
          ) => {
            result[item.id] = item.value;
            return result;
          },
          {}
        );

        const results = contentViewData.contentAccessed
          .filter(item => item.value > 0)
          .map((item: SyncGatewayInterfaces.IViewResult<number>) => {
            const contentId = item.key[item.key.length - 1];
            const isApollo = !contentMap[contentId];
            return {
              title: isApollo ? contentId : contentMap[contentId].title,
              displayType: isApollo
                ? ApolloContentDisplayTypes[contentId] || ''
                : contentMap[contentId].display_type,
              usageCount: item.value
            };
          })
          .sort((a, b) => {
            if (a.usageCount !== b.usageCount) {
              return b.usageCount - a.usageCount;
            }

            if (a.title !== b.title) {
              return a.title.localeCompare(b.title);
            }

            return a.displayType.localeCompare(b.displayType);
          });

        return Observable.of({ data: results });
      }
    );
  }

  private getFacilityActiveDeviceIds(
    facilityId: string,
    product: string,
    startKey: string[],
    endKey: string[],
    dateGroupLevel: number
  ): Observable<string[]> {
    return this.service
      .getView(bucketNames.ANALYTICS_DATA, viewNames.FACILITY_DEVICES_WITH_USAGE, {
        startkey: [facilityId, product].concat(startKey),
        endkey: [facilityId, product].concat(endKey),
        group_level: dateGroupLevel + 3,
        reduce: true,
        inclusive_end: true,
        stale: ViewStates.STALE_OK
      })
      .mergeMap(
        (
          facilityDevicesWithUsage: SyncGatewayInterfaces.IViewResult<{ device_ids: string[] }>[]
        ) => {
          if (!facilityDevicesWithUsage || !facilityDevicesWithUsage.length) {
            return Observable.of([]);
          }
          const deviceIds = facilityDevicesWithUsage.reduce(
            (list, item) => _.uniq(list.concat(item.value.device_ids || [])),
            []
          );

          return Observable.of(deviceIds);
        }
      );
  }

  private getFacilityActiveResidentIds(
    facilityId: string,
    product: string,
    startKey: string[],
    endKey: string[],
    dateGroupLevel: number
  ): Observable<string[]> {
    return this.service
      .getView(bucketNames.ANALYTICS_DATA, viewNames.FACILITY_RESIDENTS_WITH_USAGE, {
        startkey: [facilityId, product].concat(startKey),
        endkey: [facilityId, product].concat(endKey),
        group_level: dateGroupLevel + 2,
        reduce: true,
        inclusive_end: true,
        stale: ViewStates.STALE_OK
      })
      .mergeMap(
        (
          facilityResidentsWithUsage: SyncGatewayInterfaces.IViewResult<{
            resident_ids: string[];
          }>[]
        ) => {
          if (!facilityResidentsWithUsage || !facilityResidentsWithUsage.length) {
            return Observable.of([]);
          }
          const resident_ids = facilityResidentsWithUsage.reduce(
            (list, item) => _.uniq(list.concat(item.value.resident_ids || [])),
            []
          );

          return Observable.of(resident_ids);
        }
      );
  }

  private getFacilityActiveDeviceIdsAndResidentIds(
    facilityId: string,
    product: string,
    startKey: string[],
    endKey: string[],
    dateGroupLevel: number
  ): Observable<DI.IFacilityDeviceResidentWithUsage> {
    return Observable.forkJoin([
      this.getFacilityActiveDeviceIds(facilityId, product, startKey, endKey, dateGroupLevel),
      this.getFacilityActiveResidentIds(facilityId, product, startKey, endKey, dateGroupLevel)
    ]).mergeMap(([deviceIds, residentIds]: [string[], string[]]) => {
      const report = {
        facilityId,
        devicesWithUsage: deviceIds || [],
        residentsWithUsage: (residentIds || []).filter(r => r !== 'apollo' && r !== 'guest')
      };
      return Observable.of(report);
    });
  }

  private getContentViewData(
    params: DI.IDashboardParams
  ): Observable<{
    contentItems: SyncGatewayInterfaces.IViewResult<DI.IContentInfo>[];
    contentAccessed: SyncGatewayInterfaces.IViewResult<number>[];
  }> {
    let contentAccessedViewName;
    let startKey;
    let endKey;

    if (params.for === analyticsKeyNames.day) {
      contentAccessedViewName = viewNames.CONTENT_ACCESSED_BY_DAY;
      const keys = this.buildDateParameters(params, true);
      startKey = keys.startKey;
      endKey = keys.endKey;
    } else if (params.for === analyticsKeyNames.month) {
      contentAccessedViewName = viewNames.CONTENT_ACCESSED_BY_MONTH;
      const keys = this.buildDateParameters(params, false);
      startKey = keys.startKey;
      endKey = keys.endKey;
    } else {
      contentAccessedViewName = viewNames.CONTENT_ACCESSED_BY_YEAR;
      const keys = this.buildDateParameters(params, false);
      startKey = keys.startKey;
      endKey = keys.endKey;
    }

    return Observable.forkJoin(
      this.service.getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_INFO),
      this.service.getView(bucketNames.ANALYTICS_DATA, contentAccessedViewName, {
        startkey: [params.id, params.product].concat(startKey),
        endkey: [params.id, params.product].concat(endKey),
        group: true,
        reduce: true,
        inclusive_end: true
      })
    ).mergeMap(
      ([contentItems, contentAccessed]: [
        SyncGatewayInterfaces.IViewResult<DI.IContentInfo>[],
        SyncGatewayInterfaces.IViewResult<number>[]
      ]) => {
        return Observable.of({ contentItems, contentAccessed });
      }
    );
  }

  private buildDateParameters(
    params: DI.IDashboardParams,
    excludeLastKey: boolean = false
  ): { startKey: string[]; endKey: string[]; dateGroupLevel: number } {
    let startKey = [];
    let endKey = [];
    let dateGroupLevel;
    if (params.for === 'year') {
      if (excludeLastKey) {
        dateGroupLevel = 0;
      } else {
        startKey.push(params.date.year().toString());
        endKey.push(params.date.year().toString());
        dateGroupLevel = 1;
      }
    } else if (params.for === 'month') {
      startKey.push(params.date.year().toString());
      endKey.push(params.date.year().toString());

      if (excludeLastKey) {
        dateGroupLevel = 1;
      } else {
        startKey.push(_.padStart(params.date.month().toString(), 2, '0'));
        endKey.push(_.padStart(params.date.month().toString(), 2, '0'));
        dateGroupLevel = 2;
      }
    } else {
      const startDate = moment({
        year: params.date.year(),
        month: params.date.month(),
        date: params.date.date()
      });

      startKey.push(startDate.year().toString());
      startKey.push(_.padStart(startDate.month().toString(), 2, '0'));
      startKey.push(_.padStart(startDate.date().toString(), 2, '0'));

      endKey.push(startDate.year().toString());
      endKey.push(_.padStart(startDate.month().toString(), 2, '0'));
      endKey.push(_.padStart(startDate.date().toString(), 2, '0'));

      if (excludeLastKey) {
        dateGroupLevel = 2;
      } else {
        startKey.push('00');
        endKey.push('23');
        dateGroupLevel = 3;
      }
    }
    return {
      startKey,
      endKey,
      dateGroupLevel
    };
  }

  private chartKeyFormatter(rangeFor: string): DI.IKeyFormatterFunction {
    if (rangeFor === analyticsKeyNames.year) {
      return key => moment({ year: Number(key[0]), month: Number(key[1]), date: 1 }).format('MMMM');
    }

    if (rangeFor === analyticsKeyNames.month) {
      return key =>
        moment({ year: Number(key[0]), month: Number(key[1]), date: Number(key[2]) }).format(
          'MM/DD'
        );
    }

    return key => {
      const hour = Number(key[3]);
      switch (hour) {
        case 0:
          return '12 a.m.';
        case 12:
          return '12 p.m.';
        default:
          return hour > 12 ? hour - 12 + ' p.m.' : hour + ' a.m.';
      }
    };
  }

  private daysInMonth(year: number, month: number): number {
    return moment({ year, month, date: 1 })
      .add(1, 'month')
      .add(-1, 'day')
      .date();
  }

  private addEmptyChartEntries(
    results: SyncGatewayInterfaces.IViewResult<number>[],
    params: DI.IDashboardParams,
    yearIndex: number
  ): SyncGatewayInterfaces.IViewResult<number>[] {
    // console.log('addEmptyChartEntries');
    const data = [];
    if (params.for === analyticsKeyNames.year) {
      const year = params.date.year();
      for (let month = 0; month < 12; month++) {
        const key = new Array(yearIndex + 2);
        key[yearIndex] = year.toString();
        key[yearIndex + 1] = _.padStart(month.toString(), 2, '0');

        const analyticsData = results.find(
          item =>
            item.key[yearIndex] === key[yearIndex] && item.key[yearIndex + 1] === key[yearIndex + 1]
        );
        data.push({ key, value: analyticsData ? analyticsData.value : 0 });
      }
    } else if (params.for === analyticsKeyNames.month) {
      const year = params.date.year();
      const month = params.date.month();
      const lastDayOfMonth = moment({ year: year, month: month, date: 1 })
        .add(1, 'month')
        .add(-1, 'day')
        .date();
      for (let day = 1; day < lastDayOfMonth + 1; day++) {
        const key = new Array(yearIndex + 3);
        key[yearIndex] = year.toString();
        key[yearIndex + 1] = _.padStart(month.toString(), 2, '0');
        key[yearIndex + 2] = _.padStart(day.toString(), 2, '0');

        const analyticsData = results.find(
          item =>
            item.key[yearIndex] === key[yearIndex] &&
            item.key[yearIndex + 1] === key[yearIndex + 1] &&
            item.key[yearIndex + 2] === key[yearIndex + 2]
        );
        data.push({ key, value: analyticsData ? analyticsData.value : 0 });
      }
    } else if (params.for === analyticsKeyNames.day) {
      for (let i = 0; i < 24; i++) {
        const newDate = moment(params.date).add(i, 'hours');
        const year = newDate.year();
        const month = newDate.month();
        const day = newDate.date();
        const hour = newDate.hour();

        const key = new Array(yearIndex + 4);
        key[yearIndex] = year.toString();
        key[yearIndex + 1] = _.padStart(month.toString(), 2, '0');
        key[yearIndex + 2] = _.padStart(day.toString(), 2, '0');
        key[yearIndex + 3] = _.padStart(hour.toString(), 2, '0');

        const analyticsData = results.find(
          item =>
            item.key[yearIndex] === key[yearIndex] &&
            item.key[yearIndex + 1] === key[yearIndex + 1] &&
            item.key[yearIndex + 2] === key[yearIndex + 2] &&
            item.key[yearIndex + 3] === key[yearIndex + 3]
        );
        data.push({ key, value: analyticsData ? analyticsData.value : 0 });
      }
    }
    return data;
  }
}
