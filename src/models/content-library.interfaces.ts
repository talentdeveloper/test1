export namespace ContentLibraryInterfaces {
  export interface IAnalyticsContentStats {
    last_time_used: string;
    times_accessed: number;
  }

  export interface IContentMetaStats {
    _id?: string;
    title?: string;
    doc_type?: string;
    created_date: string;
    // last_active: string;
    products: {
      engage: boolean;
      focus: boolean;
      rehab: boolean;
    };
    platforms: string;
    total_content_items: number;
  }

  export interface IContentStatsResult {
    _id?: string;
    library_path: string;
    doc_type: string;
    title: string;
    total_content_items: number;
    created_date: string;
    // last_active: string;
    last_time_used: string;
    times_accessed: number;
    active_favorites: number;
    products: {
      engage: boolean;
      focus: boolean;
      rehab: boolean;
    };
    platforms: string;
  }

  export interface ISearchResult {
    _id?: string;
    type: string;
    title: string;
    library_path: string;
  }
}
