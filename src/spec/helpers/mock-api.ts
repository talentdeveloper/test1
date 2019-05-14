import { MockApiInterfaces } from './mock-api.interfaces';

export class MockApi {
  ApiResponse = class {
    constructor(public message: string, public options: any, public statusCode: number) {}
  };

  private routeMap: {
    GET: { [routeRegex: string]: MockApiInterfaces.IRouteDefinition };
    POST: { [routeRegex: string]: MockApiInterfaces.IRouteDefinition };
    PUT: { [routeRegex: string]: MockApiInterfaces.IRouteDefinition };
    DELETE: { [routeRegex: string]: MockApiInterfaces.IRouteDefinition };
  } = {
    GET: {},
    POST: {},
    PUT: {},
    DELETE: {}
  };

  constructor() {}

  buildRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    headers: { [key: string]: string | number },
    body?: any
  ): MockApiInterfaces.IMockRequest {
    const urlParts = url.match(/(https*):\/\/([^\/]+)(\/.*)/);
    const path = urlParts[3].includes('?') ? urlParts[3].split('?')[0] : urlParts[3];
    const query = urlParts[3].includes('?')
      ? urlParts[3]
          .split('?')[1]
          .split('&')
          .reduce((result, q) => Object.assign(result, { [q.split('=')[0]]: q.split('=')[1] }), {})
      : {};
    const routeRegex = this.getRouteKey(method, path);
    const routeDefinition = this.routeMap[method][routeRegex];
    const parameterValues = path.match(routeRegex).slice(1);

    return {
      originalUrl: url,
      route: routeDefinition.route,
      protocol: urlParts[1],
      secure: urlParts[1].toLowerCase() === 'https',
      host: urlParts[2],
      path,
      pathParams: routeDefinition.routeParameters.reduce(
        (result, key, index) =>
          Object.assign(result, {
            [key]: parameterValues[index]
          }),
        {}
      ),
      query,
      headers,
      normalizedHeaders: Object.keys(headers).reduce(
        (result, key) => Object.assign(result, { [key.toLowerCase()]: headers[key] }),
        {}
      ),
      body
    };
  }

  get(route: string, routeFunction: (request: any) => Promise<any>) {
    this.setRoute('GET', route, routeFunction);
  }

  callGetRoute(request: MockApiInterfaces.IMockRequest): Promise<any> {
    return this.callRoute('GET', request);
  }

  post(route: string, routeFunction: (request: any) => Promise<any>) {
    this.setRoute('POST', route, routeFunction);
  }

  callPostRoute(request: MockApiInterfaces.IMockRequest): Promise<any> {
    return this.callRoute('POST', request);
  }

  put(route: string, routeFunction: (request: any) => Promise<any>) {
    this.setRoute('PUT', route, routeFunction);
  }

  callPutRoute(request: MockApiInterfaces.IMockRequest): Promise<any> {
    return this.callRoute('PUT', request);
  }

  delete(route: string, routeFunction: (request: any) => Promise<any>) {
    this.setRoute('DELETE', route, routeFunction);
  }

  callDeleteRoute(request: MockApiInterfaces.IMockRequest): Promise<any> {
    return this.callRoute('DELETE', request);
  }

  private setRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    route: string,
    routeFunction: (request: any) => Promise<any>
  ) {
    const routeRegex = this.getRouteRegex(route);
    this.routeMap[method][routeRegex] = {
      route,
      routeFunction,
      routeParameters: route
        .match(routeRegex)
        .slice(1)
        .map(param => param.replace(/{|}/g, ''))
    };
  }

  private callRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    request: MockApiInterfaces.IMockRequest
  ): Promise<any> {
    const routeRegex = this.getRouteKey(method, request.route);
    const routeDefinition = this.routeMap[method][routeRegex];

    const result = routeDefinition.routeFunction(request);
    expect(result instanceof Promise).toBe(true);
    return result;
  }

  private getRouteKey(method: 'GET' | 'POST' | 'PUT' | 'DELETE', routeWithParams: string): string {
    const routeRegexes = Object.keys(this.routeMap[method]);
    return routeRegexes.find(regx => !!routeWithParams.match(regx));
  }

  private getRouteRegex(route: string): string {
    return `^${route.replace(/{[^}]+}/g, '([^\\/]+)')}$`;
  }
}
