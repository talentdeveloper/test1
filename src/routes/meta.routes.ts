import { BUILD_INFO } from '../build-info';

export class MetaRoutes {
  static applyRoutes(api) {
    api.get('/build-info', request => {
      return BUILD_INFO;
    });
  }
}
