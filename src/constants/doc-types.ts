export namespace DocTypeConstants {
  export const DOC_NAMESPACES = {
    ACCOUNT: 'account',
    CONTENT: 'content'
  };

  export const DOC_TYPES = {
    // Account Namespace
    ACCOUNT: {
      ACCOUNT: 'account_account',
      FACILITY: 'account_facility',
      DEVICE: 'account_device',
      DEVICE_STATUS: 'account_device-status',

      // Apollo device info
      SYSTEM_INFO: 'account_system-info'
    },

    // Content Namespace
    CONTENT: {
      // Library
      CONTENT_ITEM: 'content_item',
      LIBRARY_FOLDER: 'content_library-folder',

      // Packages
      PACKAGE: 'content_package',

      // Layout
      ROOT_CONTAINER: 'content_root-container',
      CONTAINER: 'content_container',
      LINK_TO: 'content_link-to'
    },

    MESSAGE: {
      SHARED_MEDIA: 'shared-media'
    },

    // Sync Admin
    SYNC: {
      // This does not have a namespace in order to match the doc type in other buckets.
      // This will change when all data is moved into one bucket
      DEVICE_SYNC_ADMIN: 'sync_admin',
      PORTAL_SYNC_ADMIN: 'portal_sync_admin',
      ACCOUNT_ADMIN: 'sync_account-admin',
      FACILITY_ADMIN: 'sync_facility-admin',
      IN2L_ADMIN: 'sync_in2l-admin'
    }
  };

  export const DOC_TYPES_SET = Object.keys(DOC_TYPES).reduce((result: Set<string>, ns: string) => {
    Object.keys(DOC_TYPES[ns]).forEach(type => result.add(DOC_TYPES[ns][type]));
    return result;
  }, new Set<string>());

  export function isValidDocType(docType: string): boolean {
    return DOC_TYPES_SET.has(docType);
  }
}
