import * as _ from 'lodash';
import * as moment from 'moment';
import * as ApiBuilder from 'claudia-api-builder';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { AuthenticationController, PortalAccountController } from '../controllers';
import { AuthenticationInterfaces } from '../models';
import { RequestUtils } from '../utils/request-utils';

export class PortalAccountRoutes {
  static applyRoutes(
    api: ApiBuilder,
    authenticationController: AuthenticationController,
    portalAccountController: PortalAccountController
  ) {
    api.post('/portal/accounts', request => {
      const account = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      if (!account) {
        throw new Error('Invalid account object');
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

          return portalAccountController.createAccount(account);
        })
        .toPromise();
    });
  }
}
