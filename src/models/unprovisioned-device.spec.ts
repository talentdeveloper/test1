import { UnprovisionedDevice } from './unprovisioned-device';

describe('UnprovisionedDevice', () => {
  const accountId = '789456'; // Green Acre's
  const facilityId = 'cdebd977-5105-4c25-be9d-45b26bd2dea0'; // Rolling Hills
  const deviceId = 'ea142462-eac5-81d5-8f60-d5d2dfb013d7'; // Dan's tablet
  const product = 'ENGAGE';

  describe('create', () => {
    it('should return a new unprovisioned device with the specified parameters', done => {
      const device = new UnprovisionedDevice(accountId, facilityId, deviceId, product);
      expect(device.account_id).toBe(accountId);
      expect(device.facility_id).toBe(facilityId);
      expect(device.device_id).toBe(deviceId);
      expect(device.product).toBe(product);
      done();
    });
  });
});
