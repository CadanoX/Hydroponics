const express = require("express");
const app = express();
const server = require("http").Server(app);
const IO = require("socket.io")(server);
const mongod = require("mongod");
const MongoClient = require("mongodb").MongoClient;
const config = require("./config");
const Storage = require("./Storage");
const Clock = require("./www/clock");
const usb = require("usb");
const drivelist = require("drivelist");
const fs = require("fs");

var DB = { initialized: false };
var storage = new Storage();
var storageDevices = [];
var removablesConnected = 0;
var mountInterval;
var mountTimer;
var time = 0;
var deviceSettingsFile = "settings.json";
var deviceSettings;

/* Commands are described by a receiver (sensor, pump or relay) and the command to send
 * receivers are enumerated:
 * sensor-0 = pH
 * sensor-1 = EC
 * pump-0
 * pump-1
 * relay-0
 * relay-1
 *
 * sensors have predefined commands, described in their documentation, e.g.:
 * C,1 = read the sensors value every second
 * Cal,mid,7.00 = calibrate the sensor's mid pH value to 7.00
 *
 * for pumps we use self-defined commandos:
 * 1 = on
 * 1,1000 = on for 1000 ms
 * 0 = off
 *
 * A command to put the pump on for 5 seconds would look like:
 * pump-0 1,5000
 *
 * A command to set the EC sensors name would look like:
 * sensor-1 Name,Thomas
 */
function sendCommand(receiver, command) {
  if (readMeasurementsOnly) return;

  let commandString = receiver + " " + command + "\r";
  //let commandString = "debug " + command.receiver + "," + command.name + "\r";
  if (commandString == "") console.log("Command is empty");
  // Respect the buffer size (30 bytes) defined in the Arduino code
  if (commandString.length > 80)
    console.log("TOO LONG / TOO MANY COMMANDS, WE LOST BYTES ON THE WAY !!!");

  writeToArduino(commandString);
}

// Format and copy json to deviceSettings
function retrieveSettings(json) {
  for (type in json) {
    if (!!deviceSettings[type]) {
      json[type].forEach((device, nr) => {
        Object.assign(deviceSettings[type][nr], device);
      });
    }
  }
}

// Write current settings to JSON file
function storeSettings() {
  fs.writeFile(
    deviceSettingsFile,
    JSON.stringify(deviceSettings, null, 2),
    "utf8",
    (err) => {
      if (err) console.log("Error storing settings: " + err);
    }
  );
}

// Adjust UI and send commands to apply new settings
function applySettings(json) {
  for (type in deviceSettings) {
    deviceSettings[type].forEach((device, nr) => {
      if (device.control == "Manual") {
        if (device.manualSwitch == true) {
          // Turn device on if it is off
          if (!device.isActive) {
            sendCommand(type + "-" + nr, "1");
            device.isActive = true;
          }
        } else {
          // Turn device off if it is on
          if (device.isActive) {
            sendCommand(type + "-" + nr, "0");
            device.isActive = false;
          }
        }
      } else if (device.control == "Time")
        // Test if the device should be on, based on the time configuration
        checkTimeSettings(new Date().getHours());
    });
  }
}

// Load stored settings from JSON file
function loadSettings() {
  fs.readFile(deviceSettingsFile, "utf8", (err, data) => {
    if (err) console.log("Error loading settings: " + err);
    else {
      // Decode the response
      try {
        deviceSettings = JSON.parse(data);
      } catch (e) {
        // Byte errors destroyed the format
        console.log(data);
        console.log(e);
      }
    }
  });
}

// When received measurements are outside of their defined comfort zone,
// send commands to activate regulating devices
function measurementChanged(measurement, value) {
  for (type in deviceSettings) {
    deviceSettings[type].forEach((device, nr) => {
      if (device.control == measurement) {
        if (type == "relay") {
          let activate = false;

          // If we control high values (or both) and the value is too high, active
          if (device.controlDir == "+" || device.controlDir == "+/-")
            if (value > device.scales[measurement][3]) activate = true;

          // If we control low values (or both) and the value is too low, activate
          if (device.controlDir == "-" || device.controlDir == "+/-")
            if (value < device.scales[measurement][2]) activate = true;

          if (activate) {
            if (!device.isActive) {
              sendCommand(type + "-" + nr, "1");
              device.isActive = true;
            }
          } // Deactivate
          else {
            if (device.isActive) {
              sendCommand(type + "-" + nr, "0");
              device.isActive = false;
            }
          }
        } // Pump
        else {
          if (device.isActive) return;

          // IMPORTANT: Currently scale might not be ordered,
          // so don't check if the value is in the middle range ( val > measure 2 && val < measure 3),
          // but check for + and - scales individually, if the value is inside their red ranges
          // Check upper scale
          if (device.controlDir == "+/-" || device.controlDir == "+")
            if (value < device.scales[measurement][3]) return;

          // Check lower scale
          if (device.controlDir == "+/-" || device.controlDir == "-")
            if (value > device.scales[measurement][2]) return;

          let curTime = Date.now();
          console.log(curTime - time);
          time = curTime;

          // Activate pump
          sendCommand(type + "-" + nr, "1");
          device.isActive = true;

          // Activate for longer if the measure is further off the scale
          let duration; // Time for which the pump will stay active
          if (
            value < device.scales[measurement][1] ||
            value > device.scales[measurement][4]
          )
            duration = 2000;
          else if (
            value < device.scales[measurement][2] ||
            value > device.scales[measurement][3]
          )
            duration = 1000;

          // Deactivate pump after "duration" seconds
          setTimeout(
            (type, nr) => {
              sendCommand(type + "-" + nr, "0");
            },
            duration,
            type,
            nr
          );
          // pause the pump for 30 seconds to avoid overcompensation before substances are mixed properly
          let pause = 30000;

          setTimeout(
            (device) => {
              device.isActive = false;
            },
            pause,
            device
          );
        }
      }
    });
  }
}

// Send commands for time-based control when a new hour starts
function checkTimeSettings(hour) {
  for (var type in deviceSettings) {
    deviceSettings[type].forEach((device, i) => {
      if (device.control == "Time") {
        // turn relay i on
        if (device.times[hour]) sendCommand(type + "-" + i, "1");
        // turn relay i off
        else sendCommand(type + "-" + i, "0");
      }
    });
  }
}

// Check for USB devices
usb.on("attach", function (device) {
  // Try multiple times to establish the new device as storage, until it is mounted
  // TODO: use interval per device connected based on device ID
  mountInterval = setInterval(() => {
    updateStorageDevices();
  }, 500);
  // If the device didn't mount within 10 seconds, stop trying
  mountTimer = setTimeout(() => clearInterval(mountInterval), 10000);
});

usb.on("detach", function (device) {
  updateStorageDevices();
});

function onDeviceMounted(drive) {
  // Stop trying to mount the device
  clearInterval(mountInterval);

  // Check if there is a config file on the USB device
  storage.config(drive.mountpoints[0].path);

  // Copy all stored data to USB
  if (drive.isRemovable)
    storage.copyTo(drive.mountpoints[0].path + "/OLD-data");
}

function onDeviceUnmounted(drive) {
  // Stop trying to mount if the device was removed too fast
  clearInterval(mountInterval);
}

// Keep a list of connected devices
function updateStorageDevices() {
  drivelist.list((error, drives) => {
    if (error) throw error;

    // Check if connected devices changed
    let driveWasMounted = new Array(drives.length).fill(false);
    let checked = new Array(storageDevices.length).fill(false);
    for (var i = 0; i < drives.length; i++) {
      for (var j = 0; j < storageDevices.length; j++) {
        if (drives[i].description === storageDevices[j].description) {
          driveWasMounted[i] = true;
          checked[j] = true;
          break;
        }
      }
    }

    // Treat newly connected devices
    for (var i = 0; i < driveWasMounted.length; i++)
      if (driveWasMounted[i] === false) onDeviceMounted(drives[i]);

    // Treat disconnected devices
    for (var i = 0; i < checked.length; i++)
      if (checked[i] === false) onDeviceUnmounted(storageDevices[i]);

    storageDevices = drives;
  });
}

// Arduino communication
// If no Arduino is connected, emulate an Arduino
const mockArduino = config.arduino.mockingEnabled;
const serialport = mockArduino
  ? require("serialport/test")
  : require("serialport");
var arduinoPortPath = config.arduino.portPath;
var arduinoBaudrate = config.arduino.baudRate;
const MockBinding = serialport.Binding; // Test base when no Arduino is connected
const readMeasurementsOnly = config.arduino.readMeasurementsOnly;

/* RUN AND CONNECT TO DATABASE */
const dbServer = new mongod(27017);
if (dbServer.isRunning) {
  dbServer.open((err) => {
    if (err === null) {
      // You may now connect a client to the MongoDB
      // server bound to port 27017.
    } else console.log("Database error: ", err.message);
  });

  /* CONNECT DATABASE */
  var url = "mongodb://localhost:27017/";

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("olddb");
    dbo.createCollection("measurements", function (err, res) {
      if (err) throw err;
      console.log('Collection "measurements" exists!');
      DB.measurements = dbo.collection("measurements");
      DB.initialized = true;
    });
  });
}

function storeMeasurement(measure, value) {
  if (DB.initialized) {
    var doc = { name: measure, address: value };
    DB.measurements.insertOne(doc, function (err, res) {
      if (err) throw err;
      console.log("1 document inserted");
    });
  }
}

function restoreMeasurements(measure) {
  if (DB.initialized) {
    var query = { address: "Temp" };
    DB.measurements.find(query).toArray(function (err, result) {
      if (err) throw err;
      console.log(result);
    });
  }
}

updateStorageDevices();
loadSettings();

const clock = new Clock();
clock.callbackEveryHour = checkTimeSettings;

// Create a web server
app.use(express.static("www")); // Define website folder
app.use(
  "/scripts",
  express.static("node_modules/material-components-web/dist/")
);
app.get("/", handler);
server.listen(80, () => console.log("OLD server running on port 80!"));

// Send HTML file to client
function handler(req, res) {
  res.sendFile("index.html");
}

// Send message to Arduino
function writeToArduino(message) {
  arduino.write(message, function (err) {
    if (err) console.log("Error on write: ", err.message);
    else console.log("message sent: ", message);
  });
}

// Get JSON messages from Arduino
function onDataReceived(data) {
  // Do not try to parse json, if it definitely is no json
  if (data[0] != "{") return;

  let measures = null;
  // Decode the response
  try {
    measures = JSON.parse(data);
  } catch (e) {
    // Byte errors, that destroy the format
    console.log(data);
    console.log(e);
  }
  if (measures) {
    // Send newly measured values to clients
    IO.emit("new measurements", measures);

    // React to measurements that are out of their comfort zone
    for (var m in measures) measurementChanged(m, measures[m]);

    // Store measurements
    storage.add(measures);
  }
}

// If no Arduino is connected, create fake values for test purposes
if (mockArduino) {
  arduinoPortPath = "arduinoMock";
  MockBinding.createPort(arduinoPortPath, { echo: true, record: false });
  setInterval(
    () =>
      onDataReceived(
        "{" +
          '"Temp":"' +
          Math.random() * 10 +
          '",' +
          '"WaterTemp":"' +
          Math.random() * 10 +
          '",' +
          '"PH":"' +
          Math.random() * 10 +
          '"' +
          "}"
      ),
    2000
  );
}

// Establish a connection with the Arduino
const arduino = new serialport(arduinoPortPath, {
  baudRate: arduinoBaudrate,
});

const arduinoParser = arduino.pipe(
  new serialport.parsers.Readline({ delimiter: "\r\n" })
);

// When connection is established
arduino.on("open", function () {
  console.log("Established connection to Arduino");
  //writeToArduino('test');
  //setInterval(() => writeToArduino('{"WaterTemp":    0.000,"Humidity":  450.000,"Temp":    0.000,"EC":  844.100,"TDS":  455.000,"SAL":    0.410,"GRAV":    1.000}\r\n'), 3000);
});

// When Arduino is sending data
/*
arduino.on('data', function(data)
{
	console.log("received data: " + data);
});
*/

// When Arduino is sending data ending on \r\n
arduinoParser.on("data", function (data) {
  console.log("received data: " + data);
  onDataReceived(data);
});

// On error
arduino.on("error", function (error) {
  console.log("Error in connection with Arduino: ");
  console.log(error.message);
});

// When connection is closed
arduino.on("close", function () {
  console.log("Lost connection to Arduino");
});

// Set up communication with clients
IO.sockets.on("connection", function (socket) {
  console.log("Client connected");

  // Send current settings to client
  socket.emit("settingsApplied", deviceSettings);

  // When client changed settings but cancels, send current settings to undo changes
  socket.on("settingsCancelled", function () {
    socket.emit("settingsApplied", deviceSettings);
  });

  // When client changes settings, apply them and synchronize with all other clients
  socket.on("settingsChanged", function (json) {
    if (!json) return;

    retrieveSettings(json);
    storeSettings();
    applySettings();

    // Send new settings to all clients but sender
    socket.broadcast.emit("settingsApplied", deviceSettings);
  });
});
