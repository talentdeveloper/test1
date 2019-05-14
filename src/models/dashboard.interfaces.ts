import * as moment from 'moment';

export namespace DashboardInterfaces {
  export interface IDashboardParams {
    id?: string;
    facilityId?: string;
    deviceId?: string;
    residentId?: string;
    contentId?: string;
    for?: string;
    date?: moment.Moment;
    product?: string;
  }

  export interface IProductData {
    hasApolloData: boolean;
    hasEngageData: boolean;
    hasFocusData: boolean;
    hasRehabData: boolean;
  }

  export interface IFacility {
    _id: string;
    account_id: string;
    profile: { name: string };
  }

  export interface IDevice {
    _id: string;
    account_id: string;
    facility_id: string;
    product: string;
  }

  export interface IContentInfo {
    content_type: string;
    display_type: string;
    title: string;
    products: {
      engage: boolean;
      focus: boolean;
      rehab: boolean;
    };
  }

  export interface IFacilitiesTotalUsage {
    [facilityId: string]: number;
  }

  export interface IFacilityResidentDeviceUsage {
    [id: string]: number;
  }

  export interface IResidentQuickUsage {
    lastWeekUsage: number;
    thisWeekUsage: number;
    averageDailyUsage: number;
  }

  export interface IContentPieChart {
    data: { label: string; data: number }[];
  }

  export interface IContentReport {
    data: {
      title: string;
      displayType: string;
      usageCount: number;
    }[];
  }

  export type IKeyFormatterFunction = (key: string[]) => string;

  export interface IChartData {
    data: [string, number][];
  }

  export interface IFacilityDeviceResidentWithUsage {
    facilityId: string;
    residentsWithUsage: string[];
    devicesWithUsage: string[];
  }
}
