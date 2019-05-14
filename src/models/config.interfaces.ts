export namespace ConfigInterfaces {
  export interface IConfig {
    couchbaseAnalytics: {
      url: string;
      user: string;
      password: string;
    };
    portalApi: {
      url: string;
    };
    syncGateway: {
      url: string;
      user: string;
      password: string;
    };
    apiKey: string;
    andriodGoogleOAuthClientId: string;
    iosGoogleOAuthClientId: string;
    allowTestOAuth: boolean;
    testOAuthValue: string;
  }
}
