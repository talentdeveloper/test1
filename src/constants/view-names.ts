export const viewNames = {
  // account_data views
  ACCOUNT_FACILITIES: 'account_data/_view/account_facilities',

  // date selector
  ACCOUNT_CONTENT_PRODUCTS: 'dateselector/_view/account_content_products',
  // drilldownchart
  SINGLE_KEY_USAGE_BY_HOUR: 'drilldownchart/_view/single_key_usage_by_hour',
  // facility report
  FACILITY_DEVICES_WITH_USAGE: 'facilityreport/_view/facility_devices_with_usage',
  FACILITY_RESIDENTS_WITH_USAGE: 'facilityreport/_view/facility_residents_with_usage',
  ACCOUNT_FACILITY_USAGE_BY_HOUR: 'facilityreport/_view/account_facility_usage_by_hour',
  // reports
  FACILITY_DEVICE_USAGE_BY_HOUR: 'reports/_view/facility_device_usage_by_hour',
  FACILITY_RESIDENT_USAGE_BY_HOUR: 'reports/_view/facility_resident_usage_by_hour',
  // content report
  CONTENT_ACCESSED_BY_YEAR: 'contentreport/_view/content_accessed_by_year',
  CONTENT_ACCESSED_BY_MONTH: 'contentreport/_view/content_accessed_by_month',
  CONTENT_ACCESSED_BY_DAY: 'contentreport/_view/content_accessed_by_day',
  // unprovisioned devices
  ACCOUNT_FACILITY_NAMES: 'account_data/_view/account_facility_names',
  FACILITY_NAMES: 'account_data/_view/facility_names',
  UNPROVISIONED_DEVICES: 'account_data/_view/unprovisioned_devices',
  DEVICE_ID_BY_SERIAL_NUMBER: 'account_data/_view/device_id_by_serial_number',

  // content_meta_data helper views
  CONTENT_INFO: 'content_meta_data/_view/content_info',
  // connect app
  CONTACT_RESIDENTS: 'connect_app/_view/contact_residents',

  // content library views
  ACTIVE_RESIDENT_IDS: 'content_library/_view/active_resident_ids',
  FAVORITE_CONTENT_ID_BY_RESIDENT_ID: 'content_library/_view/favorite_content_id_by_resident_id',
  CONTENT_LIBRARY_STATS: 'content_library/_view/stats', // this view exists on content_meta_data and analytics_data
  CONTENT_BY_PATH: 'content_library/_view/content_by_path',
  CONTENT_SEARCH: 'content_library/_view/search',
  USER_BY_EMAIL: 'user_profile_data/_view/user_by_email',

  MEDIA_BY_CONTACT_EMAIL: 'message_data/_view/media_messages_by_contact_email'
};
