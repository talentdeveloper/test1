import { config } from '../../../config';
import { PortalUserConstants, DocTypeConstants } from '../../../constants';
import { SyncGatewayRoutesShared } from './sync-gateway-routes-shared';

const fs = require('fs');

describe('Live Test for Sync Gateway Pass-thru Namespace, Type, and ID Route', () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;

  it(`should return docs`, done => {
    const namespace = 'account';

    // 2) CALL THE FUNCTION UNDER TEST
    const api = SyncGatewayRoutesShared.getApi();
    const mockRequest = api.buildRequest(
      'GET',
      `https://connect-api.test/sync-gateway/namespaces/${namespace}/docs`,
      {
        'access-token': 'kNOLLLrIs6okwz48T2x8QA',
        client: 'csSsKJU0JG1zyyY5zXmHwQ',
        expiry: '1557240672',
        'token-type': 'Bearer',
        uid: 'rob.wilburn.in2l+rh.fa@gmail.com'
      }
    );

    api.callGetRoute(mockRequest).then(
      result => {
        console.log(result);
        // fs.writeFileSync('./live-test-output.json', JSON.stringify(result));
        done();
      },
      error => {
        console.log('Error: ' + error);
        throw new Error(error);
      }
    );
  });
});
