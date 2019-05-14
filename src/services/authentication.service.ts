import * as _ from 'lodash';
import * as ApiBuilder from 'claudia-api-builder';
import { OAuth2Client } from 'google-auth-library';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import { RxHR } from '@akanass/rx-http-request';

import { AuthenticationInterfaces } from '../models';
import { AuthenticationResponses } from '../constants';
import { ConfigInterfaces } from '../models';

export class AuthenticationService {
  constructor(
    private config: ConfigInterfaces.IConfig,
    private andriodGoogleOAuthClient: OAuth2Client,
    private iosGoogleOAuthClient: OAuth2Client
  ) {}

  validateGoogleOAuth(
    email: string,
    token: string,
    sourceOS: string
  ): Observable<{ isAuthorized: boolean; errorMessage?: string; errorCode?: number }> {
    const client = sourceOS === 'ios' ? this.iosGoogleOAuthClient : this.andriodGoogleOAuthClient;
    return Observable.defer(async function verify() {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience:
          sourceOS === 'ios'
            ? this.config.iosGoogleOAuthClientId
            : this.config.andriodGoogleOAuthClientId
      });

      const payload = ticket.getPayload();
      return payload && payload.email === email
        ? AuthenticationResponses.AUTHORIZED
        : AuthenticationResponses.UNAUTHORIZED;
    }).catch(error => {
      console.log('OAuth failed: ' + error);
      return Observable.of(AuthenticationResponses.UNAUTHORIZED);
    });
  }

  validatePortalToken(
    authHeaders: AuthenticationInterfaces.IAuthenticationHeaders
  ): Observable<AuthenticationInterfaces.IAuthenticationResult> {
    const url = `${this.config.portalApi.url}/auth/validate_token`;
    return RxHR.get(url, {
      headers: {
        'access-token': authHeaders.accessToken,
        client: authHeaders.client,
        expiry: authHeaders.expiry,
        uid: authHeaders.uid,
        'token-type': authHeaders.tokenType
      },
      json: true
    })
      .mergeMap(data => {
        if (data.response.statusCode !== 200 || !data.response.body.success) {
          return Observable.of(AuthenticationResponses.UNAUTHORIZED);
        }

        return Observable.of(AuthenticationResponses.AUTHORIZED);
      })
      .catch(error => {
        console.log('Portal API auth failed: ' + error);
        return Observable.of(AuthenticationResponses.UNAUTHORIZED);
      });
  }
}
