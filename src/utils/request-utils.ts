import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { AuthenticationInterfaces } from '../models';

export class RequestUtils {
  static getAuthenticationHeaders(request: any): AuthenticationInterfaces.IAuthenticationHeaders {
    return {
      authorization: request.normalizedHeaders['authorization'] || '',
      accessToken: request.normalizedHeaders['access-token'] || '',
      client: request.normalizedHeaders['client'] || '',
      email: request.normalizedHeaders['email'] || '',
      expiry: request.normalizedHeaders['expiry'] || '',
      uid: request.normalizedHeaders['uid'] || '',
      tokenType: request.normalizedHeaders['token-type'] || ''
    };
  }

  // Break a url with a query parameter keys set to a string array
  // into multiple urls of no longer than 2084 characters
  static breakupUrlWithStringArrayQueryParam(
    fullUrl: string,
    keyName: string
  ): { url: string; keys: string[] }[] {
    const maxLength = 2084;

    if (!fullUrl) {
      return [];
    }

    const keysMatch = fullUrl.match(`${keyName}=\\[([^\\]]+)\\]`);
    const keys =
      keysMatch && keysMatch.length === 4
        ? keysMatch[1]
            .replace(' ', '')
            .replace('"', '')
            .split(',')
        : [];
    if (fullUrl.length <= maxLength) {
      return [
        {
          url: fullUrl,
          keys: keys
        }
      ];
    }

    const splitAt = Math.floor(keys.length / 2);
    const firstUrl = fullUrl.replace(`keys=[${keysMatch[1]}]`, keys.slice(0, splitAt).join(','));
    const secondUrl = fullUrl.replace(`keys=[${keysMatch[1]}]`, keys.slice(splitAt).join(','));
    return RequestUtils.breakupUrlWithStringArrayQueryParam(firstUrl, keyName).concat(
      RequestUtils.breakupUrlWithStringArrayQueryParam(secondUrl, keyName)
    );
  }
}
