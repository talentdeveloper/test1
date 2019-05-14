export namespace AuthenticationResponses {
  export const AUTHORIZED = {
    isAuthorized: true
  };

  export const UNAUTHORIZED = {
    isAuthorized: false,
    errorMessage: 'Unauthorized',
    errorCode: 401
  };

  export const INVALID_EMAIL = {
    isAuthorized: false,
    errorMessage: 'Invalid email',
    errorCode: 400
  };

  export const INVALID_SOURCEOS = {
    isAuthorized: false,
    errorMessage: 'Invalid Source OS header',
    errorCode: 400
  };
}
