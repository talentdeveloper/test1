import * as ApiBuilder from 'claudia-api-builder';

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
} from '../controllers';

import {
  ConnectAppRoutes,
  DashboardRoutes,
  MetaRoutes,
  PortalContentRoutes,
  PortalAccountRoutes,
  PortalFacilityRoutes,
  ProvisioningRoutes,
  SyncAdminRoutes,
  SyncGatewayRoutes
} from '.';

export class Routes {
  static applyRoutes(
    api: ApiBuilder,
    authenticationController: AuthenticationController,
    connectAppController: ConnectAppController,
    dashboardController: DashboardController,
    portalContentController: PortalContentController,
    portalAccountController: PortalAccountController,
    portalFacilityController: PortalFacilityController,
    provisioningController: ProvisioningController,
    syncAdminController: SyncAdminController,
    syncGatewayController: SyncGatewayController
  ) {
    ConnectAppRoutes.applyRoutes(api, authenticationController, connectAppController);
    DashboardRoutes.applyRoutes(api, authenticationController, dashboardController);
    MetaRoutes.applyRoutes(api);
    PortalContentRoutes.applyRoutes(api, authenticationController, portalContentController);
    PortalAccountRoutes.applyRoutes(api, authenticationController, portalAccountController);
    PortalFacilityRoutes.applyRoutes(api, authenticationController, portalFacilityController);
    ProvisioningRoutes.applyRoutes(
      api,
      authenticationController,
      provisioningController,
      syncAdminController
    );
    SyncAdminRoutes.applyRoutes(api, authenticationController, syncAdminController);
    SyncGatewayRoutes.applyRoutes(api, authenticationController, syncGatewayController);
  }
}
