import * as _ from 'lodash';
import * as nock from 'nock';

import { config } from '../../config';

export class RequestMocker {
  static disableNetRequests() {
    nock.disableNetConnect();
  }

  static enableNetRequests() {
    nock.enableNetConnect();
  }

  static clearMockedRequests() {
    nock.cleanAll();
  }

  static getPortalAuthHeaders(
    email: string
  ): {
    'Access-Token': string;
    Client: string;
    Expiry: number;
    Uid: string;
    'Token-Type': string;
  } {
    return {
      'Access-Token': 'mockAccessTokenHeader',
      Client: 'mockClientHeader',
      Expiry: 12345,
      Uid: email,
      'Token-Type': 'Bearer'
    };
  }

  static mockPortalAuthRequest(email: string = 'test@in2l.com', shouldSucceed: boolean = true) {
    nock(`${config.portalApi.url}`, {
      reqheaders: {
        'access-token': 'mockAccessTokenHeader',
        client: 'mockClientHeader',
        expiry: 12345,
        uid: email,
        'token-type': 'Bearer'
      }
    })
      .get('/auth/validate_token')
      .reply(
        shouldSucceed ? 200 : 403,
        shouldSucceed
          ? {
              success: true,
              data: {
                email: email
              }
            }
          : { success: false, errors: ['Invalid login credentials'] }
      );
  }

  static mockSyncGatewayGetRequest(
    path: string | RegExp,
    responseBody: any,
    statusCode: number = 200
  ) {
    nock(config.syncGateway.url)
      .get(path)
      .reply(statusCode, responseBody);
  }

  static mockSyncGatewayPutRequest(
    pathPattern: RegExp,
    requestBodyPattern: { [key: string]: RegExp },
    responseBody: string | RegExp,
    statusCode: number = 200
  ) {
    nock(config.syncGateway.url)
      .put(
        uri => {
          const m = uri.match(pathPattern);
          return !!m;
        },
        body => {
          const doc = typeof body === 'string' ? JSON.parse(body) : body;
          const isMatch = _.keys(requestBodyPattern).reduce((isMatch, key) => {
            if (!isMatch || !doc[key]) {
              return false;
            }
            const value = typeof doc[key] === 'string' ? doc[key] : doc[key].toString();
            const match = value.match(requestBodyPattern[key]);
            return !!match;
          }, true);
          return isMatch;
        }
      )
      .reply(statusCode, responseBody);
  }

  static mockSyncGatewayDeleteRequest(path: string | RegExp, statusCode: number = 200) {
    nock(config.syncGateway.url)
      .delete(path)
      .reply(statusCode);
  }

  static mockCouchbaseAnalyticsRequest(
    statement: string,
    parameters: { [key: string]: string },
    queryResults: any,
    statusCode: number = 200
  ) {
    const body = Object.assign({ statement: statement.trim() }, parameters);
    nock(config.couchbaseAnalytics.url)
      .post('/analytics/service', form => !!form.statement)
      .reply(
        statusCode,
        statusCode === 200
          ? {
              results: queryResults,
              status: 'success'
            }
          : {
              errors: [
                {
                  code: 24045,
                  msg: 'Query could not be completed'
                }
              ],
              status: 'fatal'
            }
      );
  }
}
