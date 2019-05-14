import { ConfigInterfaces } from './models';
import * as dotenv from 'dotenv';

dotenv.load();

if (
  !process.env.COUCHBASE_URL ||
  !process.env.COUCHBASE_USER ||
  !process.env.COUCHBASE_PASS ||
  !process.env.PORTAL_API_URL ||
  !process.env.SYNC_GATEWAY_URL ||
  !process.env.SYNC_GATEWAY_USER ||
  !process.env.SYNC_GATEWAY_PASS ||
  !process.env.ANDROID_GOOGLE_OAUTH_CLIENT_ID ||
  !process.env.IOS_GOOGLE_OAUTH_CLIENT_ID
) {
  throw new Error('Required environment variables have not been set.');
}

let couchbaseUrl = process.env.COUCHBASE_URL || '';
couchbaseUrl = couchbaseUrl.endsWith('/') ? couchbaseUrl.slice(0, -1) : couchbaseUrl;

let portalApiUrl = process.env.PORTAL_API_URL || '';
portalApiUrl = portalApiUrl.endsWith('/') ? portalApiUrl.slice(0, -1) : portalApiUrl;

let syncGatewayUrl = process.env.SYNC_GATEWAY_URL || '';
syncGatewayUrl = syncGatewayUrl.endsWith('/') ? syncGatewayUrl.slice(0, -1) : syncGatewayUrl;

const couchbaseUser = process.env.COUCHBASE_USER || '';
const couchbasePass = process.env.COUCHBASE_PASS || '';

const syncGatewayUser = process.env.SYNC_GATEWAY_USER || '';
const syncGatewayPass = process.env.SYNC_GATEWAY_PASS || '';

let cbUrl = process.env.CB_URL || '';
cbUrl = cbUrl.endsWith('/') ? cbUrl.slice(0, -1) : cbUrl;

const apiKey = process.env.API_KEY || ''; // only used for local tests

const andriodGoogleOAuthClientId = process.env.ANDRIOD_GOOGLE_OAUTH_CLIENT_ID;
const iosGoogleOAuthClientId = process.env.IOS_GOOGLE_OAUTH_CLIENT_ID;
const allowTestOAuth = !!process.env.ALLOW_TEST_OAUTH;
const testOAuthValue = allowTestOAuth ? process.env.TEST_OAUTH_VALUE : null;

export const config: ConfigInterfaces.IConfig = {
  couchbaseAnalytics: {
    url: couchbaseUrl,
    user: couchbaseUser,
    password: couchbasePass
  },
  portalApi: {
    url: portalApiUrl
  },
  syncGateway: {
    url: syncGatewayUrl,
    user: syncGatewayUser,
    password: syncGatewayPass
  },
  apiKey: apiKey,
  andriodGoogleOAuthClientId,
  iosGoogleOAuthClientId,
  allowTestOAuth,
  testOAuthValue
};
