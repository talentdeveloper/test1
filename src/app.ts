import * as ApiBuilder from 'claudia-api-builder';
import { OAuth2Client } from 'google-auth-library';

import { config } from './config';
import {
  AuthenticationController,
  ConnectAppController,
  DashboardController,
  PortalContentController,
  PortalAccountController,
  PortalFacilityController,
  ProvisioningController,
  SyncAdminController,
  SyncGatewayController
} from './controllers';
import { AuthenticationService, CouchbaseAnalyticsService, SyncGatewayService } from './services';
import { Routes } from './routes';

class App {
  api: ApiBuilder;

  constructor() {
    const andriodGoogleOAuthClientId = new OAuth2Client(config.andriodGoogleOAuthClientId);
    const iosGoogleOAuthClient = new OAuth2Client(config.iosGoogleOAuthClientId);

    const couchbaseAnalyticsService = new CouchbaseAnalyticsService(config);
    const authenticationService = new AuthenticationService(
      config,
      andriodGoogleOAuthClientId,
      iosGoogleOAuthClient
    );
    const syncGatewayService = new SyncGatewayService(config);

    const authenticationController = new AuthenticationController(
      config,
      authenticationService,
      syncGatewayService
    );
    const connectAppController = new ConnectAppController(syncGatewayService);
    const dashboardController = new DashboardController(
      couchbaseAnalyticsService,
      syncGatewayService
    );
    const portalContentController = new PortalContentController(syncGatewayService);
    const portalAccountController = new PortalAccountController(syncGatewayService);
    const portalFacilityController = new PortalFacilityController(syncGatewayService);
    const provisioningController = new ProvisioningController(syncGatewayService);
    const syncAdminController = new SyncAdminController(syncGatewayService);
    const syncGatewayController = new SyncGatewayController(
      couchbaseAnalyticsService,
      syncGatewayService
    );

    this.api = new ApiBuilder();

    this.api.corsHeaders(
      'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Api-Version,Access-Token,Client,Expiry,UID,Token-Type'
    );

    Routes.applyRoutes(
      this.api,
      authenticationController,
      connectAppController,
      dashboardController,
      portalContentController,
      portalAccountController,
      portalFacilityController,
      provisioningController,
      syncAdminController,
      syncGatewayController
    );
  }
}

module.exports = new App().api;
