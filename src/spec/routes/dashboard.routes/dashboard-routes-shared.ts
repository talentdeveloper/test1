import { config } from '../../../config';
import {
  AuthenticationService,
  CouchbaseAnalyticsService,
  SyncGatewayService
} from '../../../services';
import { AuthenticationController, DashboardController } from '../../../controllers';
import { DashboardRoutes } from '../../../routes';
import { MockApi } from '../../helpers/mock-api';
// import { PortalUserConstants } from '../../../constants';

// const account_data = require('../../data/routes/sync-gateway.routes/account_data.json');

export class DashboardRoutesShared {
  static getApi(): MockApi {
    const api = new MockApi();

    const couchbaseAnalyticsService = new CouchbaseAnalyticsService(config);
    const authenticationService = new AuthenticationService(config, null, null);
    const syncGatewayService = new SyncGatewayService(config);

    const authenticationController = new AuthenticationController(
      config,
      authenticationService,
      syncGatewayService
    );

    const syncGatewayController = new DashboardController(
      couchbaseAnalyticsService,
      syncGatewayService
    );

    DashboardRoutes.applyRoutes(api, authenticationController, syncGatewayController);

    return api;
  }
}
