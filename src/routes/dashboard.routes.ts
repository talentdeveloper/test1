import * as _ from 'lodash';
import * as moment from 'moment';
import { Observable } from 'rxjs/Observable';
import * as ApiBuilder from 'claudia-api-builder';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { DashboardInterfaces as DI } from '../models';
import { AuthenticationController, DashboardController } from '../controllers';
import { AuthenticationInterfaces } from '../models';
import { RequestUtils } from '../utils/request-utils';

export class DashboardRoutes {
  static applyRoutes(
    api: ApiBuilder,
    authenticationController: AuthenticationController,
    dashboardController: DashboardController
  ) {
    // First Year
    // Return the first year that has data
    api.get('/dashboard/firstyear/{id}', request => {
      const id = request.pathParams.id;
      if (!id) {
        throw new Error('Missing ID');
      }
      const commonParams = { id };
      // console.log(commonParams);
      return dashboardController
        .getFirstYear(commonParams)
        .mergeMap((firstYear: number) => {
          const result = {
            firstYear: firstYear,
            createdAt: moment().format()
          };
          return Observable.of(result);
        })
        .toPromise();
    });

    // Products
    api.get('/dashboard/products/{id}', request => {
      const id = request.pathParams.id;
      if (!id) {
        throw new Error('Missing ID');
      }

      const commonParams = { id };

      return dashboardController
        .getProducts(commonParams)
        .mergeMap((products: DI.IProductData) => {
          const result = {
            products,
            createdAt: moment().format()
          };
          return Observable.of(result);
        })
        .toPromise();
    });

    // Drill down chart
    api.get('/dashboard/drilldownchart/{id}', request => {
      const id = request.pathParams.id;
      if (!id) {
        throw new Error('Missing ID');
      }
      const rangeFor = request.queryString.for;
      if (!rangeFor) {
        throw new Error('Invalid range query parameter ?for. Please specify year, month, or day.');
      }
      if (!request.queryString.date || !request.queryString.date.match(/\d{4}-\d{2}-\d{2}/)) {
        throw new Error('Invalid range date. Please specify a date in the format YYYY-MM-DD.');
      }
      const rangeDate = moment(request.queryString.date, 'YYYY-MM-DD');
      const product = request.queryString.product || 'all';
      const commonParams = {
        id,
        for: rangeFor,
        date: rangeDate,
        product
      };
      // console.log(commonParams);
      return dashboardController
        .getDrillDownChartData(commonParams)
        .mergeMap((drillDownChartData: DI.IChartData) => {
          const result = {
            drillDownChart: drillDownChartData.data,
            createdAt: moment().format()
          };
          return Observable.of(result);
        })
        .toPromise();
    });

    // Account dashboard: facilities device and residents with usage
    api.get('/dashboard/withusage/{id}', request => {
      const id = request.pathParams.id;
      if (!id) {
        throw new Error('Missing account ID');
      }
      const rangeFor = request.queryString.for;
      if (!rangeFor) {
        throw new Error('Invalid range query parameter ?for. Please specify year, month, or day.');
      }
      if (!request.queryString.date || !request.queryString.date.match(/\d{4}-\d{2}-\d{2}/)) {
        throw new Error('Invalid range date. Please specify a date in the format YYYY-MM-DD.');
      }
      const rangeDate = moment(request.queryString.date, 'YYYY-MM-DD');
      const product = request.queryString.product || 'all';
      const commonParams = {
        id,
        for: rangeFor,
        date: rangeDate,
        product
      };
      // console.log(commonParams);
      return dashboardController
        .getFacilityDevicesResidentsWithUsage(commonParams)
        .mergeMap((facilitiesReportData: DI.IFacilityDeviceResidentWithUsage[]) => {
          const result = {
            facilities: facilitiesReportData || [],
            createdAt: moment().format()
          };
          return Observable.of(result);
        })
        .toPromise();
    });

    //GET community device sync times
    api.get('/dashboard/device-status/{facilityId}', request => {
      const facilityId = request.pathParams.facilityId;
      if (!facilityId) {
        throw new Error('Missing facility ID');
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

          return dashboardController.getFacilitySyncOnline(facilityId);
        })
        .toPromise();
    });

    // Account total usage by facility
    api.get('/dashboard/totalfacilityusage/{id}', request => {
      const id = request.pathParams.id;
      if (!id) {
        throw new Error('Missing account ID');
      }
      const rangeFor = request.queryString.for;
      if (!rangeFor) {
        throw new Error('Invalid range query parameter ?for. Please specify year, month, or day.');
      }
      if (!request.queryString.date || !request.queryString.date.match(/\d{4}-\d{2}-\d{2}/)) {
        throw new Error('Invalid range date. Please specify a date in the format YYYY-MM-DD.');
      }
      const rangeDate = moment(request.queryString.date, 'YYYY-MM-DD');
      const product = request.queryString.product || 'all';
      const commonParams = {
        id,
        for: rangeFor,
        date: rangeDate,
        product
      };
      // console.log(commonParams);
      return dashboardController
        .getAccountTotalUsageByFacility(commonParams)
        .mergeMap((usage: DI.IFacilitiesTotalUsage) => {
          const result = {
            facilitiesUsage: usage,
            createdAt: moment().format()
          };
          return Observable.of(result);
        })
        .toPromise();
    });

    // Facility dashboard: usage values for each device and resident in the facility
    // to be used in the Resident Usage Report and Device Usage Report
    api.get('/dashboard/facilityresidentdeviceusage/{facilityId}', request => {
      const facilityId = request.pathParams.facilityId;
      if (!facilityId) {
        throw new Error('Missing facility ID');
      }
      const rangeFor = request.queryString.for;
      if (!rangeFor) {
        throw new Error('Invalid range query parameter ?for. Please specify year, month, or day.');
      }
      if (!request.queryString.date || !request.queryString.date.match(/\d{4}-\d{2}-\d{2}/)) {
        throw new Error('Invalid range date. Please specify a date in the format YYYY-MM-DD.');
      }
      const rangeDate = moment(request.queryString.date, 'YYYY-MM-DD');
      const product = request.queryString.product || 'all';
      const commonParams = {
        id: facilityId,
        for: rangeFor,
        date: rangeDate,
        product
      };
      // console.log(commonParams);
      const deviceUsageObservable = dashboardController.getFacilityDeviceUsage(commonParams);
      const residentUsageObservable = dashboardController.getFacilityResidentUsage(commonParams);

      return Observable.forkJoin([deviceUsageObservable, residentUsageObservable])
        .mergeMap(([deviceUsage, residentUsage]: DI.IFacilityResidentDeviceUsage[]) => {
          console.log(deviceUsage);
          console.log(residentUsage);
          console.log(Object.assign({}, deviceUsage, residentUsage));
          const result = {
            residentDeviceUsage: Object.assign({}, deviceUsage, residentUsage),
            createdAt: moment().format()
          };
          return Observable.of(result);
        })
        .toPromise();
    });

    api.get('/dashboard/residentquickusage/{residentId}', request => {
      // console.log('\n\nResident Quick Usage Route Called\n\n');
      const residentId = request.pathParams.residentId;
      if (!residentId) {
        throw new Error('Missing resident ID');
      }

      const commonParams = {
        id: residentId
      };

      return dashboardController
        .getResidentQuickUsage(commonParams)
        .mergeMap((usage: DI.IResidentQuickUsage) => {
          // console.log('Usage: ' + JSON.stringify(usage));
          const result = {
            residentQuickUsage: usage,
            createdAt: moment().format()
          };
          return Observable.of(result);
        })
        .toPromise();
    });

    // Content pie chart data
    api.get('/dashboard/contentpiechart/{id}', request => {
      const id = request.pathParams.id;
      if (!id) {
        throw new Error('Missing ID');
      }
      const rangeFor = request.queryString.for;
      if (!rangeFor) {
        throw new Error('Invalid range query parameter ?for. Please specify year, month, or day.');
      }
      if (!request.queryString.date || !request.queryString.date.match(/\d{4}-\d{2}-\d{2}/)) {
        throw new Error('Invalid range date. Please specify a date in the format YYYY-MM-DD.');
      }
      const rangeDate = moment(request.queryString.date, 'YYYY-MM-DD');
      const product = request.queryString.product || 'all';
      const commonParams = {
        id,
        for: rangeFor,
        date: rangeDate,
        product
      };
      // console.log(commonParams);
      return dashboardController
        .getContentPieChartData(commonParams)
        .mergeMap((report: DI.IContentPieChart) => {
          const result = {
            pieChartData: report.data,
            createdAt: moment().format()
          };
          return Observable.of(result);
        })
        .toPromise();
    });

    // Content report data
    api.get('/dashboard/contentreport/{id}', request => {
      const id = request.pathParams.id;
      if (!id) {
        throw new Error('Missing ID');
      }
      const rangeFor = request.queryString.for;
      if (!rangeFor) {
        throw new Error('Invalid range query parameter ?for. Please specify year, month, or day.');
      }
      if (!request.queryString.date || !request.queryString.date.match(/\d{4}-\d{2}-\d{2}/)) {
        throw new Error('Invalid range date. Please specify a date in the format YYYY-MM-DD.');
      }
      const rangeDate = moment(request.queryString.date, 'YYYY-MM-DD');
      const product = request.queryString.product || 'all';
      const commonParams = {
        id,
        for: rangeFor,
        date: rangeDate,
        product
      };
      // console.log(commonParams);
      return dashboardController
        .getContentReportData(commonParams)
        .mergeMap((report: DI.IContentReport) => {
          const result = {
            contentUsageReport: report.data,
            createdAt: moment().format()
          };
          return Observable.of(result);
        })
        .toPromise();
    });
  }
}
