import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import { uuidv4 } from 'uuid/v4';

import { config } from '../config';
import { SyncGatewayService } from '../services/sync-gateway.service';
const service = new SyncGatewayService(config);

import { bucketNames } from '../constants/bucket-names';

// describe('/provisioning', () => {
//   describe('/unprovisioned-devices', () => {
//     let lambdaContextSpy;
//     let expectedDevices = [];

//     beforeEach((done) => {
//       lambdaContextSpy = jasmine.createSpyObj('lambdaContext', ['done']);
//       buildExpectedUnprovisionedDevices().subscribe(data => {
//         expectedDevices = data;
//         done();
//       });
//     });

//     it('returns list of all unprovisioned devices', (done) => {
//       app.proxyRouter({
//         requestContext: {
//           resourcePath: '/provisioning/unprovisioned-devices',
//           httpMethod: 'GET'
//         },
//         queryStringParameters: {
//         },
//         headers: {
//           'x-api-key': config.apiKey
//         },
//         pathParameters: {
//         },
//         stageVariables: {
//           SYNC_GATEWAY_URL: config.syncGateway.url,
//           SYNC_GATEWAY_USER: config.syncGateway.user,
//           SYNC_GATEWAY_PASS: config.syncGateway.password
//         }
//       }, lambdaContextSpy).then(() => {
//         const error = lambdaContextSpy.done.calls.mostRecent().args[0];
//         expect(error).toBe(null);

//         const response = lambdaContextSpy.done.calls.mostRecent().args[1];
//         expect(response.body).toBeDefined();

//         const actualDevices = JSON.parse(response.body);
//         expect(actualDevices.unprovisioned_devices.length).toBe(expectedDevices.unprovisioned_devices.length);

//         for (let i = 0; i < expectedDevices.unprovisioned_devices.length; i++) {
//           const expected = expectedDevices.unprovisioned_devices[i];
//           const actual = actualDevices.unprovisioned_devices[i];
//           expect(actual.device_id).toBe(expected.device_id);
//           expect(actual.account_id).toBe(expected.account_id);
//           expect(actual.account_name).toBe(expected.account_name);
//           expect(actual.facility_id).toBe(expected.facility_id);
//           expect(actual.facility_name).toBe(expected.facility_name);
//           expect(actual.product).toBe(expected.product);
//         }

//       }).then(done, done.fail);
//     });

//     it('returns list of ENGAGE unprovisioned devices', (done) => {
//       app.proxyRouter({
//         requestContext: {
//           resourcePath: '/provisioning/unprovisioned-devices',
//           httpMethod: 'GET'
//         },
//         queryStringParameters: {
//           product: 'engage'
//         },
//         headers: {
//           'x-api-key': config.apiKey
//         },
//         pathParameters: {
//         },
//         stageVariables: {
//           SYNC_GATEWAY_URL: config.syncGateway.url,
//           SYNC_GATEWAY_USER: config.syncGateway.user,
//           SYNC_GATEWAY_PASS: config.syncGateway.password
//         }
//       }, lambdaContextSpy).then(() => {
//         const expectedEngageDevices = expectedDevices.unprovisioned_devices.filter(d => d.product === 'ENGAGE');

//         const error = lambdaContextSpy.done.calls.mostRecent().args[0];
//         expect(error).toBe(null);

//         const response = lambdaContextSpy.done.calls.mostRecent().args[1];
//         expect(response.body).toBeDefined();

//         const actualDevices = JSON.parse(response.body);
//         expect(actualDevices.unprovisioned_devices.length).toBe(expectedEngageDevices.length);

//         for (let i = 0; i < expectedEngageDevices.length; i++) {
//           const expected = expectedEngageDevices[i];
//           const actual = actualDevices.unprovisioned_devices[i];
//           expect(actual.device_id).toBe(expected.device_id);
//           expect(actual.account_id).toBe(expected.account_id);
//           expect(actual.account_name).toBe(expected.account_name);
//           expect(actual.facility_id).toBe(expected.facility_id);
//           expect(actual.facility_name).toBe(expected.facility_name);
//           expect(actual.product).toBe(expected.product);
//         }

//       }).then(done, done.fail);
//     });

//     it('returns list of ENGAGE unprovisioned devices', (done) => {
//       app.proxyRouter({
//         requestContext: {
//           resourcePath: '/provisioning/unprovisioned-devices',
//           httpMethod: 'GET'
//         },
//         queryStringParameters: {
//           product: 'focus'
//         },
//         headers: {
//           'x-api-key': config.apiKey
//         },
//         pathParameters: {
//         },
//         stageVariables: {
//           SYNC_GATEWAY_URL: config.syncGateway.url,
//           SYNC_GATEWAY_USER: config.syncGateway.user,
//           SYNC_GATEWAY_PASS: config.syncGateway.password
//         }
//       }, lambdaContextSpy).then(() => {
//         const expectedFocusDevices = expectedDevices.unprovisioned_devices.filter(d => d.product === 'FOCUS');

//         const error = lambdaContextSpy.done.calls.mostRecent().args[0];
//         expect(error).toBe(null);

//         const response = lambdaContextSpy.done.calls.mostRecent().args[1];
//         expect(response.body).toBeDefined();

//         const actualDevices = JSON.parse(response.body);
//         expect(actualDevices.unprovisioned_devices.length).toBe(expectedFocusDevices.length);

//         for (let i = 0; i < expectedFocusDevices.length; i++) {
//           const expected = expectedFocusDevices[i];
//           const actual = actualDevices.unprovisioned_devices[i];
//           expect(actual.device_id).toBe(expected.device_id);
//           expect(actual.account_id).toBe(expected.account_id);
//           expect(actual.account_name).toBe(expected.account_name);
//           expect(actual.facility_id).toBe(expected.facility_id);
//           expect(actual.facility_name).toBe(expected.facility_name);
//           expect(actual.product).toBe(expected.product);
//         }

//       }).then(done, done.fail);
//     });
//   });

//   describe('/provision-device/:deviceId', () => {
//     let deviceId;
//     let device;
//     let serialNumber;
//     let lambdaContextSpy;

//     beforeEach(done => {
//       lambdaContextSpy = jasmine.createSpyObj('lambdaContext', ['done']);
//       serialNumber = 'connectapiserialnumber' + uuidv4().slice(0, 5);
//       createUnprovisionedDevice()
//         .subscribe(newDevice => {
//           device = newDevice;
//           deviceId = newDevice._id;
//           done();
//         });
//     });

//     afterEach(done => {
//       deleteTestDeviceWithUser(device, serialNumber).subscribe(() => {
//         deviceId = null;
//         device = null;
//         serialNumber = null;
//         done();
//       });
//     });

//     it('adds serial number to unprovisioned device', (done) => {
//       app.proxyRouter({
//         requestContext: {
//           resourcePath: '/provisioning/provision-device/{deviceId}',
//           httpMethod: 'PATCH'
//         },
//         queryStringParameters: {
//         },
//         headers: {
//           'x-api-key': config.apiKey
//         },
//         pathParameters: {
//           deviceId: deviceId
//         },
//         body: JSON.stringify({ serial_number: serialNumber }),
//         stageVariables: {
//           SYNC_GATEWAY_URL: config.syncGateway.url,
//           SYNC_GATEWAY_USER: config.syncGateway.user,
//           SYNC_GATEWAY_PASS: config.syncGateway.password
//         }
//       }, lambdaContextSpy).then(() => {
//         const error = lambdaContextSpy.done.calls.mostRecent().args[0];
//         expect(error).toBe(null);

//         const response = lambdaContextSpy.done.calls.mostRecent().args[1];
//         expect(response.body).toBeDefined();

//         const updatedDevice = JSON.parse(response.body);
//         expect(updatedDevice._id).toBe(deviceId);
//         expect(updatedDevice.serial_number).toBe(serialNumber);

//         getTestDevice(deviceId)
//           .flatMap(remoteDevice => {
//             expect(remoteDevice).toBeDefined();
//             expect(remoteDevice._id).toBe(deviceId);
//             expect(remoteDevice.serial_number).toBe(serialNumber);

//             return getTestDeviceUser(serialNumber);
//           })
//           .subscribe(user => {
//             expect(user.name).toBe(serialNumber);

//             done();
//           },
//           done.fail);
//       });
//     });
//   });
// });

// const buildExpectedUnprovisionedDevices = () => {
//   const service = new SyncGatewayService(config);
//   return service.getAll(bucketNames.ACCOUNT_DATA).flatMap(docs => {
//     const accounts = docs.filter(doc => doc.doc_type === 'account');
//     const facilities = docs.filter(doc => doc.doc_type === 'facility');
//     const devices = docs
//       .filter(doc => doc.doc_type === 'device' && !doc.serial_number)
//       .map(device => {
//         const accountName = accounts.find(a => a._id === device.account_id).profile.account_name;
//         const facilityName = facilities.find(f => f._id === device.facility_id).profile.name;
//         return {
//           account_id: device.account_id,
//           account_name: accountName,
//           facility_id: device.facility_id,
//           facility_name: facilityName,
//           device_id: device._id,
//           product: device.product
//         };
//       });

//     devices.sort((a, b) => a.device_id.localeCompare(b.device_id));
//     return Observable.of({
//       unprovisioned_devices: devices
//     });
//   });
// };

// const createUnprovisionedDevice = () => {
//   const service = new SyncGatewayService(config);
//   return service.update(bucketNames.ACCOUNT_DATA, {
//     _id: uuidv4(),
//     account_id: 'connect-api-test-runner-account-id',
//     content_mode: 'approved',
//     created_by: 'connect-api-test-runner',
//     created_date: '2018-07-16T17:28:25.432Z',
//     doc_type: 'device',
//     external_nickname: '',
//     facility_id: 'connect-api-test-runner-facility-id',
//     modified_by: '',
//     modified_date: '',
//     nickname: 'connect-api-test-runner',
//     product: 'ENGAGE',
//     resident_mode: 'all',
//     skill_level: 3,
//     status: 'active',
//     terms_of_use_agreement: []
//   });
// };

// const getTestDevice = deviceId => {
//   return service.get(bucketNames.ACCOUNT_DATA, deviceId);
// };

// const getTestDeviceUser = serialNumber => {
//   return service.getUser(bucketNames.ACCOUNT_DATA, serialNumber);
// };

// const deleteTestDeviceWithUser = (device, serial_number) => {
//   // console.log(device);
//   return Observable.forkJoin(
//     service.delete(bucketNames.ACCOUNT_DATA, device),
//     service.deleteUser(bucketNames.ACCOUNT_DATA, serial_number)
//   );
// };
