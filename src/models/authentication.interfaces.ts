export namespace AuthenticationInterfaces {
  export interface IAuthenticationResult {
    isAuthorized: boolean;
    account_id?: string;
    email?: string;
    facility_ids?: string[];
    userType?: string;
    errorMessage?: string;
    errorCode?: number;
  }

  export interface IAuthenticationHeaders {
    authorization: string;
    accessToken: string;
    client: string;
    email: string;
    expiry: string;
    uid: string;
    tokenType: string;
  }

  export interface ISyncAdminDoc {
    _id: string;
    _rev: string;
    account_id?: string;
    doc_type: string;
    email: string;
    facility_ids?: string[];
    syncUsername: string;
    type: string;
    userProfileId: string;
  }
}
