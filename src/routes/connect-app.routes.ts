import * as _ from 'lodash';
import * as ApiBuilder from 'claudia-api-builder';
import { OAuth2Client } from 'google-auth-library';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/defer';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/catch';

import { AuthenticationInterfaces } from '../models';
import { AuthenticationController, ConnectAppController } from '../controllers';

const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'video/3gpp'];

export class ConnectAppRoutes {
  static applyRoutes(
    api: ApiBuilder,
    authenticationController: AuthenticationController,
    connectAppController: ConnectAppController
  ) {
    api.setBinaryMediaTypes(VALID_MEDIA_TYPES);

    api.get('/connect-app/residents', request => {
      const email = (request.normalizedHeaders.email || '').toLowerCase();
      const oauthObservable = authenticationController.validateGoogleOAuth(
        request.normalizedHeaders.authorization,
        email,
        request.normalizedHeaders.sourceos
      );

      const residentsObservable = connectAppController.getContactResidents(email);

      return oauthObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }
          return residentsObservable;
        })
        .toPromise();
    });

    api.get(
      '/connect-app/contact-media',
      request => {
        const email = (request.normalizedHeaders.email || '').toLowerCase();
        const oauthObservable = authenticationController.validateGoogleOAuth(
          request.normalizedHeaders.authorization,
          email,
          request.normalizedHeaders.sourceos
        );

        return oauthObservable
          .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
            if (!authResult.isAuthorized) {
              return Observable.of(
                new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
              );
            }
            return connectAppController.getIndexOfMedia(email);
          })
          .toPromise();
      },
      {
        success: {
          contentType: 'application/json'
        }
      }
    );

    api.post(
      '/connect-app/residents/{residentId}/message',
      request => {
        const residentId = request.pathParams.residentId || '';
        if (!residentId) {
          return Observable.of(new api.ApiResponse('Invalid residentId in path', {}, 400));
        }

        const email = (request.normalizedHeaders.email || '').toLowerCase();
        const oauthObservable = authenticationController.validateGoogleOAuth(
          request.normalizedHeaders.authorization,
          email,
          request.normalizedHeaders.sourceos
        );

        const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

        const message = body.message || '';


        return oauthObservable
          .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
            if (!authResult.isAuthorized) {
              return Observable.of(
                new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
              );
            }

            return connectAppController.createMessage(
              residentId,
              email,
              message
            );
          })
          .toPromise();
      }
    );

    api.get('/connect-app/messages', request => {
      const sequenceId = (request.queryString.since || '');
      if (!sequenceId) {
        return Observable.of(new api.ApiResponse('Invalid sequenceId in path', {}, 400));
      }

      const email = (request.normalizedHeaders.email || '').toLowerCase();
      const oauthObservable = authenticationController.validateGoogleOAuth(
        request.normalizedHeaders.authorization,
        email,
        request.normalizedHeaders.sourceos
      );

      const messagesObservable = connectAppController.getMessageChanges(email, sequenceId);

      return oauthObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }
          return messagesObservable;
        })
        .toPromise();
    });


    api.get(
      '/connect-app/residents/{residentId}/profileimage',
      request => {
        const residentId = request.pathParams.residentId || '';
        if (!residentId) {
          return Observable.of(new api.ApiResponse('Invalid residentId in path', {}, 400));
        }

        const accept = request.normalizedHeaders['accept'] || '';
        if (!VALID_MEDIA_TYPES.includes(accept)) {
          return Observable.of(
            new api.ApiResponse(
              `Invalid Accept header. Valid types are ${VALID_MEDIA_TYPES.join(', ')}`,
              {},
              400
            )
          );
        }

        const email = (request.normalizedHeaders.email || '').toLowerCase();
        const oauthObservable = authenticationController.validateGoogleOAuth(
          request.normalizedHeaders.authorization,
          email,
          request.normalizedHeaders.sourceos
        );

        // Observables are created here so that they can execute asynchronously
        const residentObservable = connectAppController.getResidentProfileImage(residentId);

        return oauthObservable
          .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
            if (!authResult.isAuthorized) {
              return Observable.of(
                new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
              );
            }
            return residentObservable;
          })
          .mergeMap(resident => {
            if (!resident) {
              return Observable.of(new api.ApiResponse('Invalid residentId in path', {}, 400));
            }

            if (!_.get(resident, 'family.members', []).filter(contact => contact.email === email)) {
              return Observable.of(new api.ApiResponse('Unauthorized', {}, 401));
            }

            //return resident.profile_image ? resident.profile_image : '/assets/img/user/generic.png';
            //return resident.profile_image ? resident.profile_image : Observable.of(new api.ApiResponse('not found', {}, 404));
            return _.get(resident, '_attachments.profile_image', null)
              ? resident.profile_image
              : Observable.of(new api.ApiResponse('not found', {}, 404));
          })
          .toPromise();
      },
      {
        success: {
          contentType: 'image/jpeg',
          contentHandling: 'CONVERT_TO_BINARY'
        }
      }
    );
    api.post('/connect-app/status', request => {
      const email = (request.normalizedHeaders.email || '').toLowerCase();
      const oauthObservable = authenticationController.validateGoogleOAuth(
        request.normalizedHeaders.authorization,
        email,
        request.normalizedHeaders.sourceos
      );

      const status = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; // the body may come in as a string or a json object
      const isOnline = typeof status.online === 'string' ? status.online === 'true' : status.online; // status.online could be either a string or a boolean

      return oauthObservable
        .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
          if (!authResult.isAuthorized) {
            return Observable.of(
              new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
            );
          }

          return connectAppController
            .updateContactOnlineStatus(email, isOnline)
            .mergeMap(result => {
              console.log(result);
              return Observable.of('OK');
            });
        })
        .toPromise();
    });

    api.get(
      '/connect-app/residents/{residentId}/media/{messageId}',
      request => {
        const residentId = request.pathParams.residentId || '';
        const messageId = request.pathParams.messageId || '';
        if (!residentId) {
          return Observable.of(new api.ApiResponse('Invalid residentId in path', {}, 400));
        }
        if (!messageId) {
          return Observable.of(new api.ApiResponse('Invalid messageId in path', {}, 400));
        }

        const accept = request.normalizedHeaders['accept'] || '';
        if (!VALID_MEDIA_TYPES.includes(accept)) {
          return Observable.of(
            new api.ApiResponse(
              `Invalid Accept header. Valid types are ${VALID_MEDIA_TYPES.join(', ')}`,
              {},
              400
            )
          );
        }

        const email = (request.normalizedHeaders.email || '').toLowerCase();
        const oauthObservable = authenticationController.validateGoogleOAuth(
          request.normalizedHeaders.authorization,
          email,
          request.normalizedHeaders.sourceos
        );

        // Observables are created here so that they can execute asynchronously
        const residentObservable = connectAppController.getResident(residentId);
        const messageObservable = connectAppController.getMessageAttachment(messageId, (request.queryString.thumbnail || '') === 'true');

        return oauthObservable
          .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
            if (!authResult.isAuthorized) {
              return Observable.of(
                new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
              );
            }

            return residentObservable;
          })
          .mergeMap(resident => {
            if (!resident) {
              return Observable.of(new api.ApiResponse('Invalid residentId in path', {}, 400));
            }

            if (!_.get(resident, 'family.members', []).filter(contact => contact.email === email)) {
              return Observable.of(new api.ApiResponse('Unauthorized', {}, 401));
            }

            return messageObservable;
          })
          .toPromise();
      },
      {
        success: {
          contentType: 'image/jpeg',
          contentHandling: 'CONVERT_TO_BINARY'
        }
      }
    );

    api.post(
      '/connect-app/residents/{residentId}/media',
      request => {
        const residentId = request.pathParams.residentId || '';
        if (!residentId) {
          return Observable.of(new api.ApiResponse('Invalid residentId in path', {}, 400));
        }

        const contentType = request.normalizedHeaders['content-type'] || '';
        if (!VALID_MEDIA_TYPES.includes(contentType)) {
          return Observable.of(
            new api.ApiResponse(
              `Invalid Content-Type header. Valid types are ${VALID_MEDIA_TYPES.join(', ')}`,
              {},
              400
            )
          );
        }

        const email = (request.normalizedHeaders.email || '').toLowerCase();
        const oauthObservable = authenticationController.validateGoogleOAuth(
          request.normalizedHeaders.authorization,
          email,
          request.normalizedHeaders.sourceos
        );

        return oauthObservable
          .mergeMap((authResult: AuthenticationInterfaces.IAuthenticationResult) => {
            if (!authResult.isAuthorized) {
              return Observable.of(
                new api.ApiResponse(authResult.errorMessage, {}, authResult.errorCode)
              );
            }

            return connectAppController.createMessageWithAttachment(
              residentId,
              email,
              contentType,
              request.body
            );
          })
          .toPromise();
      },
      {
        requestContentHandling: 'CONVERT_TO_TEXT',
        success: {
          contentType: 'application/json'
        }
      }
    );
  }
}
