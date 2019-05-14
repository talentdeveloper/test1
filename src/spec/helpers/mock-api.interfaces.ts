export namespace MockApiInterfaces {
  export interface IRouteDefinition {
    route: string;
    routeFunction: (request: any) => Promise<any>;
    routeParameters: string[];
  }

  export interface IMockRequest {
    originalUrl: string;
    route: string;
    protocol: string;
    secure: boolean;
    host: string;
    path: string;
    pathParams: { [key: string]: string };
    query: { [key: string]: string };
    headers: { [key: string]: string | number };
    normalizedHeaders: { [key: string]: string | number };
    body: any;
  }
}
