# ConnectAPI

Connect API supports iN2L Engage, Focus, and Rehab products including mobile devices and the web portal.

# Usage

## Required Headers

Every API route requires the following header(s):

x-api-key: {API-KEY}

## Routes

## Provisioning

*GET /provisioning/unprovisioned-devices*

Optional Query String Parameters:

product={"ENGAGE" | "FOCUS" | "REHAB"}

Sample Response Body:

``` json
{
  "unprovisioned_devices": [
    {
      "account_id": "account1",
      "account_name": "Account name 1",
      "facility_id": "facility1",
      "facility_name": "Facility name 1",
      "device_id": "device1",
      "product": "ENGAGE"
    },
    {
      "account_id": "account2",
      "account_name": "Account name 2",
      "facility_id": "facility2",
      "facility_name": "Facility name 2",
      "device_id": "device2",
      "product": "ENGAGE"
    }
  ]
}
```

*PATCH /provisioning/provision-device/{device_id}*

Patch Payload:

``` json
{
  "serial_number": {serial_number}
}

