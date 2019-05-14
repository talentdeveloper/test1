import * as _ from 'lodash';
import * as moment from 'moment';
import * as ApiBuilder from 'claudia-api-builder';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { AuthenticationController, PortalFacilityController } from '../controllers';
import { AuthenticationInterfaces } from '../models';
import { RequestUtils } from '../utils/request-utils';

export class PortalFacilityRoutes {
  static applyRoutes(
    api: ApiBuilder,
    authenticationController: AuthenticationController,
    portalFacilityController: PortalFacilityController
  ) {
    api.post('/portal/facilities', request => {
      const facility = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      if (!facility) {
        throw new Error('Invalid facility object');
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

          return portalFacilityController.createFacility(facility);
        })
        .toPromise();
    });
  }
}
