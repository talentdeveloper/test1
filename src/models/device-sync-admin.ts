export class DeviceSyncAdmin {
  _id?: string;
  _rev?: string;
  serial_number: string;
  device_id?: string;
  account_id?: string;
  facility_id?: string;
  resident_ids?: string[];
  type: string; // DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE_SYNC_ADMIN
}
