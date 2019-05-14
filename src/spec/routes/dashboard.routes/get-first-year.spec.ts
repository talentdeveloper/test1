import * as _ from 'lodash';
import * as moment from 'moment';

import { RequestMocker } from '../../helpers';
import { DashboardRoutesShared } from './dashboard-routes-shared';
import { CouchbaseAnalyticsQueries } from '../../../constants';

describe('Dashboard first year', () => {
  beforeAll(() => {
    RequestMocker.disableNetRequests();
  });

  beforeEach(() => {
    RequestMocker.clearMockedRequests();
  });

  afterAll(() => {
    RequestMocker.clearMockedRequests();
    RequestMocker.enableNetRequests();
  });

  /**
   * Happy path GET first year tests
   */
  it('should return correct year', done => {
    testIt('1234', true, done);
  });

  /**
   * Sad path GET first year
   */
  it('should return current year where there is no analytics data', done => {
    testIt('1234', false, done);
  });
});

/**
 * Shared test function
 */

function testIt(id: string, hasAnalyticsData: boolean, done: () => void) {
  const expectedYear = hasAnalyticsData ? 2017 : moment().year();

  // 1) MOCK HTTP REQUESTS

  // Mock the request for the document IDs to request from Sync Gateway
  let statementParams = { $ID: `"${id}"` };
  RequestMocker.mockCouchbaseAnalyticsRequest(
    CouchbaseAnalyticsQueries.DASHBOARD_FIRST_YEAR,
    statementParams,
    hasAnalyticsData ? [expectedYear] : [null]
  );

  // 2) CALL THE FUNCTION UNDER TEST
  const api = DashboardRoutesShared.getApi();
  const mockRequest = api.buildRequest(
    'GET',
    `https://connectapi.test/dashboard/firstyear/${id}`,
    {}
  );
  api.callGetRoute(mockRequest).then(
    result => {
      // 3) VERIFY RESULTS
      expect(result).toBeDefined('Expected first year object but got undefined');
      expect(result.firstYear).toBe(
        expectedYear,
        `Expected ${result.firstYear} to be ${expectedYear}`
      );
      expect(moment(result.createdAt).isValid()).toBe(
        true,
        `Expected createdAt to be a valid date but got ${result.createdAt}`
      );
      done();
    },
    errorResult => {
      expect(false).toBe(
        true,
        `Unexpected failure caused the error function to be called. Message: ${errorResult.message}`
      );
      done();
    }
  );
}
