//*
var config = require('./config');

var Storage = require('./Storage');

// web server
const express = require('express')
const app = express()
const server = require('http').Server(app);
// client communication
const IO = require('socket.io')(server)
// database
const mongod = require('mongod');
const MongoClient = require('mongodb').MongoClient;
var DB = { initialized: false };

const usb = require('usb');
var removablesConnected = 0;
var mountInterval;
var mountTimer;
const drivelist = require('drivelist');
const fs = require('fs');

var storage = new Storage();
var storageDevices = [];

/*/
import {config} from './config';
import express from 'express';
import http from'http';
import io from 'socket.io';
import mongod from'mongod';
import * as mongodb from 'mongodb';
import fs from'fs';
import serialport from 'serialport/test';

const app = express();
const server = http.Server(app);
const IO = io(server);
const MongoClient = mongodb.MongoClient;
var DB = { initialized: false };
//*/

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

var time = 0;

var deviceSettingsFile = "settings.json";
var deviceSettings;

function sendCommand(receiver, command)
{
	if (readMeasurementsOnly)
		return;

	let commandString = receiver + " " + command + "\r";
	//let commandString = "debug " + command.receiver + "," + command.name + "\r";
	if (commandString == "")
		console.log("Command is empty");
	if (commandString.length > 30) // because our Arduino script currently has an array for 30 bytes
		console.log("TOO LONG / TOO MANY COMMANDS, WE LOST BYTES ON THE WAY !!!");

	writeToArduino(commandString);
}


function applySettings(json)
{
	if (!json)
		return;
	
	// copy new settings
	for (type in json) {
		if (!!deviceSettings[type]) {
			json[type].forEach( (device, nr) =>	{
				Object.assign(deviceSettings[type][nr], device);
			});
		}
	}

	storeSettings();

	// apply settings
	for (type in deviceSettings)
	{
		deviceSettings[type].forEach( (device, nr) =>
		{
			if (device.control == "Manual")
			{
				if (device.manualSwitch == true) {
					if (!device.isActive) {
						sendCommand(type + "-" + nr, "1");
						device.isActive = true;
					}
				}
				else {
					if (device.isActive) {
						sendCommand(type + "-" + nr, "0");
						device.isActive = false;
					}
				}
			}
			else if (device.control == "Time")
				// test if the relay should be on, based on the time configuration
				clockSignalFullHour(new Date().getHours());
		});
	}
}

function storeSettings()
{
	fs.writeFile(deviceSettingsFile, JSON.stringify(deviceSettings, null, 2), 'utf8', (err) => {
	if (err)
		console.log("Error storing settings: " + err);
	});
}

function loadSettings()
{
	fs.readFile(deviceSettingsFile, 'utf8', (err, data) => {
		if (err)
			console.log("Error loading settings: " + err);
		else {
			// decode the response
			try {
				deviceSettings = JSON.parse(data);
			}
			catch(e) {
				// byte errors, that destroy the format
				console.log(data);
				console.log(e);
			}
		}
	});
}

function measurementChanged(measurement, value)
{
	for (type in deviceSettings)
	{
		deviceSettings[type].forEach( (device, nr) =>
		{
			if (device.control == measurement)
			{
				if (type == "relay")
				{
					let activate = false;

					if (device.controlDir == '+'
						|| device.controlDir == '+/-')
						if (value > device.scales[measurement][3])
							activate = true;

					if (device.controlDir == '-'
						|| device.controlDir == '+/-')
						if (value < device.scales[measurement][2])
							activate = true;

					if (activate)
					{
						if (!device.isActive) {
							sendCommand(type + '-' + nr, "1");
							device.isActive = true;
						}
					}
					else // deactivate relay
					{
						if (device.isActive) {
							sendCommand(type + '-' + nr, "0");
							device.isActive = false;
						}
					}
				}
				else // pump				
				{
					if (device.isActive)
						return;

					// IMPORTANT: Currently scale might not be ordered,
					//so don't check if the value is in the middle range ( val > measure 2 && val < measure 3),
					// but check for + and - scales individually, if the value is inside their red ranges
					// check upper scale
					if (device.controlDir == "+/-" || device.controlDir == "+")
						if (value < device.scales[measurement][3])
							return;

					// check lower scale
					if (device.controlDir == "+/-" || device.controlDir == "-")
						if (value > device.scales[measurement][2])
							return;

					let curTime = Date.now();
					console.log(curTime - time);
					time = curTime;

					//activate pump
					sendCommand(type + '-' + nr, "1");
					device.isActive = true;
				
					let duration; // time the pump will stay active
					if (value < device.scales[measurement][1] || value > device.scales[measurement][4])
						duration = 2000;
					else if (value < device.scales[measurement][2] || value > device.scales[measurement][3])
						duration = 1000;
					
					// deactivate pump after "duration" seconds
					setTimeout((type, nr) => { sendCommand(type + '-' + nr, "0"); }, duration, type, nr);
					// pause the pump for 2 minutes
					let pause = 0.5 * 60000;

					setTimeout((device) => {
						device.isActive = false;
					}, pause, device);
				}
			}
		});
	}
}

//TODO: move clock signals to server !! or they will be triggered by each client
function clockSignalFullHour(hour)
{
	for (var type in deviceSettings)
	{
		deviceSettings[type].forEach( (device, nr) =>
		{
			if (device.control == "Time")
			{
				if (device.times[hour])
					sendCommand(type + '-' + nr, '1'); // set relay i to on
				else
					sendCommand(type + '-' + nr, '0'); // set relay i to off
			}
		});
	}
}

// check for USB devices
usb.on('attach', function(device) {
	//console.log(device);
	// TODO: use interval per device connected based on device ID
	// try multiple times to establish the new device as storage, until it is mounted
	mountInterval = setInterval(() => {	updateStorageDevices(); }, 500);
	// if the device didn't mount within 10 seconds, stop trying
	mountTimer = setTimeout(() => clearInterval(mountInterval), 10000);
});

usb.on('detach', function(device) {
	//console.log(device);
	updateStorageDevices();
});

function onDeviceMounted(drive)
{
	//console.log("mounted");
	//console.log(drive);
	clearInterval(mountInterval);
	
	storage.config(drive.mountpoints[0].path);
	if (drive.isRemovable)
		storage.copy(drive.mountpoints[0].path + "/OLD-data");
	//TODO: copy all data from device to USB
}
function onDeviceUnmounted(drive)
{
	//console.log("unmounted");
	//console.log(drive);
	clearInterval(mountInterval);
}

function updateStorageDevices()
{
	drivelist.list((error, drives) =>
	{
		if (error)
			throw error;

		// check if devices changed
		let driveWasMounted = new Array(drives.length).fill(false);
		let checked = new Array(storageDevices.length).fill(false);
		for (var i = 0; i < drives.length; i++)
		{
			for (var j = 0; j < storageDevices.length; j++)
			{
				if (drives[i].description === storageDevices[j].description)
				{
					driveWasMounted[i] = true;
					checked[j] = true;
					break;
				}
			}
		}

		for (var i = 0; i < driveWasMounted.length; i++)
			if (driveWasMounted[i] === false)
				onDeviceMounted(drives[i]);

		for (var i = 0; i < checked.length; i++)
			if (checked[i] === false)
				onDeviceUnmounted(storageDevices[i]);

		storageDevices = drives;
	});
}

// arduino communication
const mockArduino = config.arduino.mockingEnabled; // emulate an arduino, in case you got no arduino connected
const serialport = mockArduino ? require("serialport/test") : require("serialport");
var arduinoPortPath = config.arduino.portPath;
var arduinoBaudrate = config.arduino.baudRate;
const MockBinding = serialport.Binding; // Test base when no arduino is connected
const readMeasurementsOnly = config.arduino.readMeasurementsOnly;

/* RUN AND CONNECT TO DATABASE */
const dbServer = new mongod(27017);
if (dbServer.isRunning)
{
	dbServer.open((err) => {
		if (err === null) {
		// You may now connect a client to the MongoDB
		// server bound to port 27017.
		}
		else
			console.log('Database error: ', err.message);
	});

	/* CONNECT DATABASE */
	var url = "mongodb://localhost:27017/";

	MongoClient.connect(url, function(err, db)
	{
		if (err) throw err;
		var dbo = db.db("olddb");
		dbo.createCollection("measurements", function(err, res) {
			if (err) throw err;
			console.log("Collection \"measurements\" exists!");
			DB.measurements = dbo.collection("measurements");
			DB.initialized = true;
		});
	});
}

function storeMeasurement(measure, value)
{
	if (DB.initialized)
	{
		var doc = { name: measure, address: value };
		DB.measurements.insertOne(doc, function(err, res)
		{
			if (err) throw err;
			console.log("1 document inserted");
		});
	}
}

function restoreMeasurements(measure)
{
	if (DB.initialized)
	{
		var query = { address: "Temp" };
		DB.measurements.find(query).toArray(function(err, result)
		{
			if (err) throw err;
			console.log(result);
		});
	}
}

updateStorageDevices();
loadSettings();


/* CREATE WEB SERVER */
app.use(express.static('www')); // show where the web site lies
app.use('/scripts', express.static('node_modules/material-components-web/dist/'));
app.get('/', handler);
server.listen(80, () => console.log('OLD server running on port 80!'));

function handler (req, res)
{
	//read file index.html in public folder
	//res.sendFile(DIRNAME + '/index.html');
	res.sendFile('index.html');
}

/* DEFINE ARDUINO BEHAVIOUR */

function writeToArduino(message)
{
	arduino.write(message, function(err)
	{
		if (err)
			console.log('Error on write: ', err.message);
		else
			console.log('message sent: ', message);
	});
}

function onDataReceived(data)
{
	if (data[0] == "{") // don't even try to parse json, if it definitely is no json
	{
		let measures = null;
		// decode the response
		try
		{
			measures = JSON.parse(data);
		}
		catch(e)
		{
			// byte errors, that destroy the format
			console.log(data);
			console.log(e);
		}
		if (measures)
		{
			IO.emit("new measurements", measures);
			for (var m in measures)
				measurementChanged(m, measures[m])
			storage.add(measures);
		}
	}
}

/* ESTABLISH ARDUINO CONNECTION */
if (mockArduino)
{
	arduinoPortPath = "arduinoMock";
	MockBinding.createPort(arduinoPortPath, { echo: true, record: false });
	setInterval(() => onDataReceived("{"+
		"\"Temp\":\""+Math.random()*10+"\","+
		"\"WaterTemp\":\""+Math.random()*10+"\","+
		"\"PH\":\""+Math.random()*10+"\""+
		"}"), 2000);
}

const arduino = new serialport(arduinoPortPath, {
	baudRate: arduinoBaudrate
});

const arduinoParser = arduino.pipe(new serialport.parsers.Readline({ delimiter: '\r\n' }));

// WHEN CONNECTION IS ESTABLISHED
arduino.on("open", function ()
{
	console.log('Established connection to Arduino');
	//writeToArduino('test');
	//setInterval(() => writeToArduino('{"WaterTemp":    0.000,"Humidity":  450.000,"Temp":    0.000,"EC":  844.100,"TDS":  455.000,"SAL":    0.410,"GRAV":    1.000}\r\n'), 3000);
});

// when Arduino is sending data
/*
arduino.on('data', function(data)
{
	console.log("received data: " + data);
});
*/

// when Arduino is sending data ending on \r\n
arduinoParser.on('data', function(data)
{
	console.log("received data: " + data);
	onDataReceived(data);
});

// on error
arduino.on('error', function(error)
{
	console.log("Error in connection with Arduino: ");
	console.log(error.message);
});

// when connection is closed
arduino.on('close', function()
{
	console.log("Lost connection to Arduino");
});

// WebSocket Connection
IO.sockets.on('connection', function (socket)
{
	console.log("Client connected");
	socket.emit("settingsApplied", deviceSettings); // send current settings to client

	socket.on('settingsCancelled', function() {
		socket.emit("settingsApplied", deviceSettings); // send current settings to client
	});

	socket.on('settingsChanged', function(json) {
		applySettings(json);
		socket.broadcast.emit('settingsApplied', deviceSettings); // send new settings to all clients but sender
	});
});