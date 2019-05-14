export class UnprovisionedDevice {
  account_id: string;
  account_name: string;
  facility_id: string;
  facility_name: string;
  device_id: string;
  product: string;

  constructor(accountId, facilityId, deviceId, product) {
    this.account_id = accountId;
    this.account_name = '';
    this.facility_id = facilityId;
    this.facility_name = '';
    this.device_id = deviceId;
    this.product = product;
  }
}
