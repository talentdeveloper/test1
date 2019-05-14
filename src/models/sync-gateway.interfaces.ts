export namespace SyncGatewayInterfaces {
  export interface IViewQueryParams {
    key?: any;
    keys?: any[];
    startkey?: any;
    endkey?: any;
    endkeyexact?: any;
    group?: boolean;
    group_level?: number;
    inclusive_end?: boolean;
    limit?: number;
    reduce?: boolean;
    stale?: 'update_after' | 'ok' | 'false';
  }

  export interface IViewResult<T> {
    id: string;
    key: any;
    value: T;
  }

  export interface IUpdateResult {
    id: string;
    rev?: string;
    ok: boolean;
    error?: string;
    reason?: string;
  }

  export interface IBulkUpdateResult {
    id?: string;
    rev?: string;
    error?: string;
    reason?: string;
    status?: number;
  }

  export interface ISyncGatewayDocument {
    _id?: string;
    _rev?: string;
    doc_type?: string;
    account_id?: string;
    facility_id?: string;
  }
}
