# homebridge-garagedoor-loxone-deconz
[Homebridge](https://github.com/nfarina/homebridge) plugin that supports triggering commands to check state, open, and close a garage door.

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-garagedoor-loxone-deconz`
3. Update your configuration file. See the sample below.

## Configuration

Configuration sample:

```json
"accessories": [
  {
    "accessory": "GaragedoorLoxoneDeconz",
    "user": "admin",
    "password": "adminpw",
    "urldec": "http://YourServer:1234",
    "apidec": "AABBCC5678",
    "urllox": "http://YourLoxoneIP",
    "garagedoorlox": "Garagedoor",
    "status_update_delay": 15,
    "poll_state_delay": 20,
    "ignore_errors": false,
    "log_polling": false
  }
]

```

## Credits
Based on [homebridge-garagedoor-command](https://github.com/apexad/homebridge-garagedoor-command)

