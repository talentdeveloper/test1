import * as ApiBuilder from 'claudia-api-builder';
import { AuthenticationController, PortalContentController } from '../controllers';

export class PortalContentRoutes {
  static applyRoutes(
    api: ApiBuilder,
    authenticationController: AuthenticationController,
    portalContentController: PortalContentController
  ) {
    api.get('/portal-content/activefavorites', request => {
      return portalContentController.getActiveFavorites().toPromise();
    });

    api.get('/portal-content/analytics', request => {
      return portalContentController.getContentAnalytics().toPromise();
    });

    api.get('/portal-content/librarypaths', request => {
      return portalContentController.getLibraryPaths().toPromise();
    });

    api.get('/portal-content/libraryitems', request => {
      const contentPath = request.queryString.contentpath || '';
      return portalContentController.getLibraryItems(contentPath).toPromise();
    });

    api.get('/portal-content/search/{searchText}', request => {
      const searchText = request.pathParams.searchText;
      if (!searchText) {
        throw new Error('Invalid search text. Please provide at least 3 characters to search for.');
      }

      return portalContentController.getSearchResults(searchText).toPromise();
    });

    api.put('/portal-content/librarypaths', request => {
      const invalidBodyError = new Error(
        'PUT body should contain oldLibraryPath and newLibraryPath properties'
      );

      if (!request.body) {
        throw invalidBodyError;
      }

      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      if (!body.oldLibraryPath || !body.newLibraryPath) {
        throw invalidBodyError;
      }

      return portalContentController
        .updateLibraryPath(body.oldLibraryPath, body.newLibraryPath)
        .toPromise();
    });

    api.put('/portal-content/librarymove', request => {
      const invalidBodyError = new Error(
        'PUT body should contain oldLibraryPath, newLibraryPath, and items properties'
      );

      if (!request.body) {
        throw invalidBodyError;
      }

      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      if (!body.oldLibraryPath || !body.newLibraryPath || !body.items) {
        throw invalidBodyError;
      }

      return portalContentController
        .moveLibraryItems(body.oldLibraryPath, body.newLibraryPath, body.items)
        .toPromise();
    });

    api.put('/portal-content/librarydelete', request => {
      const invalidBodyError = new Error(
        'PUT body should contain libraryPath and items properties'
      );

      if (!request.body) {
        throw invalidBodyError;
      }

      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      if (!body.libraryPath || !body.items) {
        throw invalidBodyError;
      }

      return portalContentController.deleteLibraryItems(body.libraryPath, body.items).toPromise();
    });
  }
}
