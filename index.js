const fetch = require("node-fetch");
var Service;
var Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-garagedoor-loxone-deconz', 'GaragedoorLoxoneDeconz', GarageCmdAccessory);
};

function GarageCmdAccessory(log, config) {
  this.log = log;
  this.name = config.name;
  this.user = config.user;
  this.password = config.password;
  this.urldec = config.urldec;
  this.apidec = config.apidec;
  this.sensorupid = config.sensorupid;
  this.sensordownid = config.sensordownid;
  this.urllox = config.urllox;
  this.garagedoorlox = config.garagedoorlox;
  this.stateCommand = true;
  this.statusUpdateDelay = config.status_update_delay || 15;
  this.pollStateDelay = config.poll_state_delay || 0;
  this.ignoreErrors = config.ignore_errors || false;
  this.logPolling = config.log_polling || false;
}

GarageCmdAccessory.prototype.setState = function(isClosed, callback, context) {
  if (context === 'pollState') {
    // The state has been updated by the pollState command - don't run the open/close command
    callback(null);
    return;
  }

  var accessory = this;
  var state = isClosed ? 'open' : 'close';
  var prop = state + 'Command';
  var command = accessory[prop];
  let username = this.user;
  let password = this.password;
  let headers = new fetch.Headers();
  headers.set('Authorization', 'Basic ' + Buffer.from(username + ":" + password).toString('base64'));

  var config = {
      method:'GET',
      headers: headers,
      credentials: 'include'
  }
  accessory.log('Commnand to run: ' + command);

  accessory.log('Set ' + accessory.name + ' to ' + state);

  fetch(accessory.urldec+'/api/'+accessory.apidec+'/sensors')
  .then((response) => {
      return response.json();
  })
  .then((data) => {
    var garageDownOpen = data[accessory.sensordownid].state.open
    var garageUpOpen = data[accessory.sensorupid].state.open

    if (!garageDownOpen && garageUpOpen) {
      //here loxone
      fetch(accessory.urllox+'/dev/sps/io/'+accessory.garagedoorlox+'/On', config)

      accessory.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
      setTimeout(
        function() {
          accessory.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
          fetch(accessory.urllox+'/dev/sps/io/'+accessory.garagedoorlox+'/Off', config)
        },
        accessory.statusUpdateDelay * 1000
      );
    } else if (garageDownOpen && !garageUpOpen) {
      //here loxone
      fetch(accessory.urllox+'/dev/sps/io/'+accessory.garagedoorlox+'/On', config)

      accessory.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
      setTimeout(
        function() {
          accessory.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
          fetch(accessory.urllox+'/dev/sps/io/'+accessory.garagedoorlox+'/Off', config)
        },
        accessory.statusUpdateDelay * 1000
      );
    }
    callback(null);
  });

 
};
     

GarageCmdAccessory.prototype.getState = function(callback) {
  var accessory = this;
  fetch(accessory.urldec+'/api/'+accessory.apidec+'/sensors')
  .then((response) => {
      return response.json();
  })
  .then((data) => {
      var garageDownOpen = data[accessory.sensordownid].state.open
      var garageUpOpen = data[accessory.sensorupid].state.open

      var state = '';
      if (!garageDownOpen && garageUpOpen) {
        state = 'CLOSED';
      } 
      if (garageDownOpen && !garageUpOpen) {
        state = 'OPEN';
      }
      if (accessory.logPolling) {
        accessory.log('State of ' + accessory.name + ' is: ' + state);
      }

      callback(null, Characteristic.CurrentDoorState[state]);
      
  
      if (accessory.pollStateDelay > 0) {
        accessory.pollState();
      }
  });
};

GarageCmdAccessory.prototype.pollState = function() {
  var accessory = this;

  // Clear any existing timer
  if (accessory.stateTimer) {
    clearTimeout(accessory.stateTimer);
    accessory.stateTimer = null;
  }

  accessory.stateTimer = setTimeout(
    function() {
      accessory.getState(function(err, currentDeviceState) {
        if (err) {
          accessory.log(err);
          return;
        }

        if (currentDeviceState === Characteristic.CurrentDoorState.OPEN || currentDeviceState === Characteristic.CurrentDoorState.CLOSED) {
          // Set the target state to match the actual state
          // If this isn't done the Home app will show the door in the wrong transitioning state (opening/closing)
          accessory.garageDoorService.getCharacteristic(Characteristic.TargetDoorState)
            .setValue(currentDeviceState, null, 'pollState');
        }
        accessory.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, currentDeviceState);
      })
    },
    accessory.pollStateDelay * 1000
  );
}

GarageCmdAccessory.prototype.getServices = function() {
  this.informationService = new Service.AccessoryInformation();
  this.garageDoorService = new Service.GarageDoorOpener(this.name);

  this.informationService
  .setCharacteristic(Characteristic.Manufacturer, 'Garage Command')
  .setCharacteristic(Characteristic.Model, 'Homebridge Plugin')
  .setCharacteristic(Characteristic.SerialNumber, '001');

  this.garageDoorService.getCharacteristic(Characteristic.TargetDoorState)
  .on('set', this.setState.bind(this));

  if (this.stateCommand) {
    this.garageDoorService.getCharacteristic(Characteristic.CurrentDoorState)
    .on('get', this.getState.bind(this));
    this.garageDoorService.getCharacteristic(Characteristic.TargetDoorState)
    .on('get', this.getState.bind(this));
  }

  return [this.informationService, this.garageDoorService];
};
