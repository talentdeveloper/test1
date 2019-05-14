export namespace CouchbaseAnalyticsQueries {
  /**
   * Sync Gateway Pass-thru queries
   */
  // By namespace
  export const ID_BY_DOC_TYPE = `select value meta().id from account_data where doc_type like $DOC_TYPE`;
  export const ID_BY_DOC_TYPE_ACCOUNT = `
    select value meta().id from account_data
    where doc_type like $DOC_TYPE and meta().id = $ACCOUNT_ID or account_id = $ACCOUNT_ID`;
  export const ID_BY_DOC_TYPE_ACCOUNT_FACILITIES = `
    select value meta().id from account_data
    where doc_type like $DOC_TYPE
    and (
      meta().id = $ACCOUNT_ID
      or array_contains($FACILITY_IDS, meta().id)
      or array_contains($FACILITY_IDS, facility_id)
    )`;

  /**
   * Dashboard Queries
   */

  // ID - accountId or facilityId
  export const DASHBOARD_FIRST_YEAR = `select value min(date_part_str(start_date, 'year'))
    from device_content_analytics_data where array_contains([account_id, facility_id], $ID)`;

  // ID - accountId or facilityId
  export const DASHBOARD_PRODUCTS = `select if_missing(product, 'focus') as product, count(*) as total
    from device_content_analytics_data where array_contains([account_id, facility_id], $ID) group by product`;

  // ACCOUNT_ID - Quoted account_id
  // FACILITY_ID - Quoted facility_id
  // RANGE_START_DATE - Quoted start date string. Usage that crosses this date will be cut off.
  //   For example, if the range is the year 2018, then the RANGE_START_DATE would be '2018-01-01' (inclusive start)
  // RANGE_END_DATE - Quoted end date string. Usage that crosses this date will be cut off.
  //   For example, if the range is the year 2018, then the RANGE_END_DATE would be '2019-01-01' (exclusive end)
  // DIVISOR - Number of days or hours to divide total usage by
  export const FACILITY_DASHBOARD_DEVICE_RESIDENT_USAGE_ALL = `
    SELECT device_id AS id, SUM(usage_seconds)/3600 AS average_usage FROM (
      SELECT
       device_id,
       date_diff_str(least($RANGE_END_DATE, end_date), greatest($RANGE_START_DATE, start_date), 'second') AS usage_seconds
      FROM device_content_analytics_data
      WHERE facility_id = $FACILITY_ID
      AND device_id IS KNOWN AND device_id <> ''
      AND end_date > start_date
      AND end_date > $RANGE_START_DATE AND start_date < $RANGE_END_DATE) usage
    GROUP BY usage.device_id
    UNION ALL
    SELECT IF_MISSING(resident_id, 'guest') AS id, SUM(usage_seconds)/3600 AS average_usage FROM (
      SELECT
        resident_id,
        date_diff_str(least($RANGE_END_DATE, end_date), greatest($RANGE_START_DATE, start_date), 'second') AS usage_seconds
      FROM device_content_analytics_data
      WHERE facility_id = $FACILITY_ID
      AND end_date > start_date
      AND end_date > $RANGE_START_DATE AND start_date < $RANGE_END_DATE
      AND product IS UNKNOWN) usage
    GROUP BY usage.resident_id`;

  export const FACILITY_DASHBOARD_DEVICE_RESIDENT_USAGE_APOLLO = `
    SELECT device_id AS id, SUM(usage_seconds)/3600 AS average_usage FROM (
      SELECT
       device_id,
       date_diff_str(least($RANGE_END_DATE, end_date), greatest($RANGE_START_DATE, start_date), 'second') AS usage_seconds
      FROM device_content_analytics_data
      WHERE facility_id = $FACILITY_ID
      AND device_id IS KNOWN AND device_id <> ''
      AND end_date > start_date
      AND end_date > $RANGE_START_DATE AND start_date < $RANGE_END_DATE
      AND product = 'apollo') usage
    GROUP BY usage.device_id`;

  export const FACILITY_DASHBOARD_DEVICE_RESIDENT_USAGE_FOCUS = `
    SELECT device_id AS id, SUM(usage_seconds)/3600 AS average_usage FROM (
      SELECT
       device_id,
       date_diff_str(least($RANGE_END_DATE, end_date), greatest($RANGE_START_DATE, start_date), 'second') AS usage_seconds
      FROM device_content_analytics_data
      WHERE facility_id = $FACILITY_ID
      AND device_id IS KNOWN AND device_id <> ''
      AND end_date > start_date
      AND end_date > $RANGE_START_DATE AND start_date < $RANGE_END_DATE
      AND product IS UNKNOWN) usage
    GROUP BY usage.device_id
    UNION ALL
    SELECT IF_MISSING(resident_id, 'guest') AS id, SUM(usage_seconds)/3600 AS average_usage FROM (
      SELECT
        resident_id,
        date_diff_str(least($RANGE_END_DATE, end_date), greatest($RANGE_START_DATE, start_date), 'second') AS usage_seconds
      FROM device_content_analytics_data
      WHERE facility_id = $FACILITY_ID
      AND end_date > start_date
      AND end_date > $RANGE_START_DATE AND start_date < $RANGE_END_DATE
      AND product IS UNKNOWN) usage
    GROUP BY usage.resident_id`;

  export const FACILITY_DASHBOARD_DEVICE_SINC_ONLINE = `
    SELECT device_id, max(synced_at) AS last_sync, max(online_at) AS last_online
    FROM device_status_analytics_data
    WHERE facility_id = $FACILITY_ID
    GROUP BY device_id`;
}
