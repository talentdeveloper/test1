import * as _ from 'lodash';
import * as moment from 'moment';
import * as uuidv4 from 'uuid/v4';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { bucketNames, DocTypeConstants, viewNames } from '../constants';
import { ContentLibraryInterfaces as CLI, LibraryItem, SyncGatewayInterfaces } from '../models';
import { SyncGatewayService } from '../services/sync-gateway.service';

export class PortalContentController {
  constructor(private service: SyncGatewayService) { }

  getActiveFavorites(): Observable<{ [contentId: string]: number }> {
    // Get number of times each content item has been favorite'd by an active resident
    return this.service
      .getView(bucketNames.RESIDENT_DATA, viewNames.ACTIVE_RESIDENT_IDS)
      .mergeMap((activeResidentIds: SyncGatewayInterfaces.IViewResult<[string[], string]>[]) => {
        const ids = activeResidentIds.map(item => item.value);
        return this.service.getView(
          bucketNames.FAVORITES_DATA,
          viewNames.FAVORITE_CONTENT_ID_BY_RESIDENT_ID,
          {
            keys: ids,
            group: true,
            reduce: true
          }
        );
      })
      .mergeMap((results: SyncGatewayInterfaces.IViewResult<{ [contentId: string]: number }>[]) => {
        const contentIdFavoriteCount = results.reduce((combinedResult, residentResult) => {
          Object.keys(residentResult.value).forEach(contentId => {
            combinedResult[contentId] =
              (combinedResult[contentId] || 0) + residentResult.value[contentId];
          });
          return combinedResult;
        }, {});
        return Observable.of(contentIdFavoriteCount);
      });
  }

  getContentAnalytics(): Observable<{ [id: string]: CLI.IAnalyticsContentStats }> {
    // Get content usage stats
    return this.service
      .getView(bucketNames.ANALYTICS_DATA, viewNames.CONTENT_LIBRARY_STATS, {
        reduce: true,
        group_level: 1
      })
      .mergeMap(
        (
          results: SyncGatewayInterfaces.IViewResult<CLI.IAnalyticsContentStats>[]
        ): Observable<{ [id: string]: CLI.IAnalyticsContentStats }> => {
          const stats = results.reduce((result, item) => {
            result[item.key] = item.value;
            return result;
          }, {});
          return Observable.of(stats);
        }
      );
  }

  getLibraryPaths(): Observable<string[]> {
    return this.service
      .getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_LIBRARY_STATS, {
        reduce: true,
        group: true
      })
      .mergeMap((results: SyncGatewayInterfaces.IViewResult<CLI.IAnalyticsContentStats>[]) => {
        const paths = results
          .filter(item => !!item.key.length)
          .map(item => '/' + item.key.slice(1).join('/'))
          .sort();
        return Observable.of(paths);
      });
  }

  getLibraryItems(path: string): Observable<CLI.IContentStatsResult[]> {
    const pathKey = path === '/' ? ['/'] : path.split('/');
    pathKey[0] = '/';

    // Get the virtual folder stats
    const folderStatsObservable = this.service
      .getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_LIBRARY_STATS, {
        reduce: true,
        group_level: pathKey.length + 1,
        startkey: pathKey.concat([' ']),
        endkey: pathKey
      })
      .mergeMap((results: SyncGatewayInterfaces.IViewResult<CLI.IContentMetaStats>[]) => {
        const stats: CLI.IContentMetaStats[] = results.map(item => {
          item.value.title = item.key[item.key.length - 1];
          item.value.doc_type = DocTypeConstants.DOC_TYPES.CONTENT.LIBRARY_FOLDER;
          return item.value;
        });

        return Observable.of(stats);
      });

    // Get the actual content item stats
    const contentItemStatsObservable = this.service
      .getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_LIBRARY_STATS, {
        reduce: false,
        startkey: pathKey,
        endkeyexact: pathKey
      })
      .mergeMap((results: SyncGatewayInterfaces.IViewResult<CLI.IContentMetaStats>[]) => {
        const stats: CLI.IContentMetaStats[] = results
          .filter(item => item.value.doc_type === DocTypeConstants.DOC_TYPES.CONTENT.CONTENT_ITEM)
          .map(item => item.value);
        return Observable.of(stats);
      });

    return Observable.forkJoin([folderStatsObservable, contentItemStatsObservable]).mergeMap(
      ([contentFolderStats, contentItemStats]: [
        CLI.IContentMetaStats[],
        CLI.IContentMetaStats[]
      ]) => {
        contentFolderStats.sort((a, b) => a.title.localeCompare(b.title));
        contentItemStats.sort((a, b) => a.title.localeCompare(b.title));

        const results: CLI.IContentStatsResult[] = contentFolderStats
          .concat(contentItemStats)
          .map(item => {
            const output: CLI.IContentStatsResult = {
              _id: item._id || '',
              library_path: path,
              doc_type: item.doc_type,
              title: item.title,
              total_content_items: item.total_content_items,
              created_date: item.created_date,
              // last_active: item.last_active,
              last_time_used: null,
              times_accessed: null,
              active_favorites: null,
              products: item.products,
              selpackages: Object.keys(item.products)
                .filter(key => item.products[key])
                .join(', ')
                .toLowerCase(),
              //selpackages: null,
              platforms: Object.keys(item.products)
                .filter(key => item.products[key])
                .join(', ')
                .toUpperCase(),
            };

            return output;
          });


        return Observable.of(results);
      }
    );
  }

  getSearchResults(searchText: string): Observable<CLI.ISearchResult[]> {
    return this.service
      .getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_SEARCH, {
        key: encodeURIComponent(searchText.toLowerCase())
      })
      .mergeMap((results: SyncGatewayInterfaces.IViewResult<CLI.ISearchResult>[]) => {
        const uniqueMap = results.reduce((uniques, item) => {
          if (!uniques[item.value._id]) {
            uniques[item.value._id] = item.value;
          }

          return uniques;
        }, {});
        const uniqueItems = Object.keys(uniqueMap).map(key => uniqueMap[key]);
        return Observable.of(uniqueItems.sort((a, b) => a.title.localeCompare(b.title)));
      });
  }

  updateLibraryPath(
    oldLibraryPath: string,
    newLibraryPath: string
  ): Observable<SyncGatewayInterfaces.IBulkUpdateResult[]> {
    const oldLibraryPathKey = oldLibraryPath === '/' ? ['/'] : oldLibraryPath.split('/');
    oldLibraryPathKey[0] = '/';

    return this.service
      .getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_BY_PATH, {
        reduce: false,
        startkey: oldLibraryPathKey,
        endkey: oldLibraryPathKey
      })
      .mergeMap(
        (
          results: SyncGatewayInterfaces.IViewResult<{
            _id: string;
            _rev: string;
            library_path: string;
          }>[]
        ) => {
          const contentItems = results.map(item => item.value);
          contentItems.forEach(item => {
            item.library_path = item.library_path.replace(oldLibraryPath, newLibraryPath);
          });
          return this.service.bulkUpdate(bucketNames.CONTENT_META_DATA, contentItems);
        }
      );
  }

  moveLibraryItems(
    oldLibraryPath: string,
    newLibraryPath: string,
    items: CLI.IContentMetaStats[]
  ): Observable<SyncGatewayInterfaces.IBulkUpdateResult[]> {
    const oldLibraryPathKey = oldLibraryPath === '/' ? ['/'] : oldLibraryPath.split('/');
    oldLibraryPathKey[0] = '/';

    const moveContentIdSet = new Set(items.filter(item => !!item._id).map(item => item._id));
    const moveFolderTitles = items.filter(item => !item._id).map(item => item.title);

    return Observable.forkJoin(
      this.service.getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_BY_PATH, {
        reduce: false,
        key: oldLibraryPathKey
      }),
      this.service.getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_BY_PATH, {
        reduce: false,
        startkey: oldLibraryPathKey,
        endkey: oldLibraryPathKey
      })
    ).mergeMap(
      ([parentFolderResults, results]: [
        SyncGatewayInterfaces.IViewResult<LibraryItem>[],
        SyncGatewayInterfaces.IViewResult<{ _id: string; _rev: string; library_path: string }>[]
      ]) => {
        const existingParentFolder = parentFolderResults
          .filter(
            item =>
              item.value.doc_type === DocTypeConstants.DOC_TYPES.CONTENT.LIBRARY_FOLDER &&
              item.value.library_path === oldLibraryPath
          )
          .map(item => item.value);

        const contentItems = results
          .filter(item => moveContentIdSet.has(item.id))
          .map(item => item.value);
        contentItems.forEach(item => {
          item.library_path = item.library_path.replace(oldLibraryPath, newLibraryPath);
        });
        const contentUpdates = this.service.bulkUpdate(bucketNames.CONTENT_META_DATA, contentItems);
        const folderUpdates = moveFolderTitles.map(title => {
          const oldPath = (oldLibraryPath === '/' ? '' : oldLibraryPath) + '/' + title;
          const newPath = (newLibraryPath === '/' ? '' : newLibraryPath) + '/' + title;
          return this.updateLibraryPath(oldPath, newPath);
        });

        let updateItems: any[] = contentItems;
        if (!existingParentFolder) {
          const newParentFolder: LibraryItem = {
            _id: uuidv4(),
            library_path: oldLibraryPath,
            created_date: moment.utc().toISOString(),
            doc_type: DocTypeConstants.DOC_TYPES.CONTENT.LIBRARY_FOLDER
          };
          updateItems.push(newParentFolder);
        }

        return Observable.forkJoin([contentUpdates, ...folderUpdates]).mergeMap(results => {
          const flatResults = results.reduce((flatArray, itemArray) => {
            return flatArray.concat(itemArray);
          }, []);
          return Observable.of(flatResults);
        });
      }
    );
  }

  deleteLibraryItems(
    libraryPath: string,
    items: CLI.IContentStatsResult[]
  ): Observable<SyncGatewayInterfaces.IBulkUpdateResult[]> {
    const libraryPathKey = libraryPath === '/' ? ['/'] : libraryPath.split('/');
    libraryPathKey[0] = '/';

    const deleteContentIdSet = new Set(items.filter(item => !!item._id).map(item => item._id));
    const deleteFolderTitleSet = new Set(items.filter(item => !item._id).map(item => item.title));

    return Observable.forkJoin(
      this.service.getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_BY_PATH, {
        reduce: false,
        key: libraryPathKey
      }),
      this.service.getView(bucketNames.CONTENT_META_DATA, viewNames.CONTENT_BY_PATH, {
        reduce: false,
        startkey: libraryPathKey,
        endkey: libraryPathKey
      })
    ).mergeMap(
      ([parentFolderResults, results]: [
        SyncGatewayInterfaces.IViewResult<LibraryItem>[],
        SyncGatewayInterfaces.IViewResult<{
          _id: string;
          _rev: string;
          title: string;
          doc_type: string;
          library_path: string;
        }>[]
      ]) => {
        const filteredParentFolderResults = parentFolderResults
          .filter(
            item =>
              item.value.doc_type === DocTypeConstants.DOC_TYPES.CONTENT.LIBRARY_FOLDER &&
              item.value.library_path === libraryPath
          )
          .map(item => item.value);

        const parentFolder = filteredParentFolderResults.length
          ? filteredParentFolderResults[0]
          : null;

        const folderItems = results
          .filter(item => {
            const itemKey = item.value.library_path.split('/');
            const title = itemKey[libraryPathKey.length];
            return (
              item.value.doc_type === DocTypeConstants.DOC_TYPES.CONTENT.LIBRARY_FOLDER &&
              deleteFolderTitleSet.has(title)
            );
          })
          .map(item => item.value);

        folderItems.forEach(item => {
          item['_deleted'] = true;
        });

        const contentItems = results
          .filter(
            item =>
              item.value.doc_type === DocTypeConstants.DOC_TYPES.CONTENT.CONTENT_ITEM &&
              deleteContentIdSet.has(item.id)
          )
          .map(item => item.value);

        contentItems.forEach(item => {
          item['_deleted'] = true;
        });

        let updateItems: any[] = [...contentItems, ...folderItems];
        if (!parentFolder) {
          const newParentFolder: LibraryItem = {
            _id: uuidv4(),
            library_path: libraryPath,
            created_date: moment.utc().toISOString(),
            doc_type: DocTypeConstants.DOC_TYPES.CONTENT.LIBRARY_FOLDER
          };
          updateItems.push(newParentFolder);
        }

        return this.service.bulkUpdate(bucketNames.CONTENT_META_DATA, updateItems);
      }
    );
  }
}
