//*
var config = require('./config');

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

const fs = require('fs');
const usb = require('usb');
var removablesConnected = 0;
var mountInterval;
var mountTimer;
const drivelist = require('drivelist');
var storagePath;
var dataFilename;

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

// check for USB devices
usb.on('attach', function(device) {
	// try to establish the new device as storage, until it is mounted
	mountInterval = setInterval(() => {	changeStorageDevice(); }, 500);
	// if the device didn't mount within 10 seconds, stop trying
	mountTimer = setTimeout(() => clearInterval(mountInterval), 10000);
});

usb.on('detach', function(device) {
	// when USB is disconnected before being mounted, stop trying to use it as storage
	if (removablesConnected <= 0)
		clearInterval(mountInterval);

	// go back to HDD (or a previous USB) as storage device
	changeStorageDevice();
});

function directoryExists(filePath) {
	try { return fs.statSync(filePath).isDirectory(); }
	catch (err) { return false; }
}

function changeStorageDevice()
{
	drivelist.list((error, drives) =>
	{
		if (error)
			throw error;

		let hdds = [];
		let removables = [];

		let i = 0;
		drives.forEach(function(drive)
		{
			console.log(drive);
			if (drive.isRemovable) {
				removables.push(drive);
			}
			else
				hdds.push(drive);
		});

		removablesConnected = removables.length;

		let oldStoragePath = storagePath;
		
		if (removables.length > 0)
			storagePath = removables[removables.length - 1].mountpoints[0].path + 'OLD-data';
		else
			storagePath = hdds[0].mountpoints[0].path + 'OLD-data';

		if (oldStoragePath != storagePath)
		{
			console.log("new storage path: " + storagePath)
			console.log(directoryExists(storagePath));

			// if the data folder does not exist on the device, create it
			if (!directoryExists(storagePath))
				fs.mkdirSync(storagePath);

			changeDataFile();

			// communicate, that the new device was properly mounted and selected as storage
			// ISSUE: If a second device is added, before the first one is mounted,
			// then the first one will be used as storage, although the second was connected later
			clearInterval(mountInterval);
		}
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

changeStorageDevice();
function changeDataFile()
{
	dataFilename = 'data' + new Date().getTime() + '.csv';
}

function storeMeasurementsInFile(measures)
{
    const logFilePath = storagePath + '/' + dataFilename;
    const timestamp = new Date().toLocaleString();
	for (var m in measures)
	{
		const data = `${timestamp},${m},${measures[m]}\n`;
		fs.appendFile(logFilePath, data, (error) =>
		{
			if (error) {
				console.error(`Write error to ${dataFilename}: ${error.message}`);
			}
		});
	}
}

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
			IO.emit('new measurements', measures);
			/*if (measures.Temp)
				storeMeasurement("Temp", measures.Temp);*/
			storeMeasurementsInFile(measures);
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
	socket.on('new command', function(command)
	{
		if (readMeasurementsOnly)
			return;
			
		let commandString = command.receiver + " " + command.name + "\r";
		//let commandString = "debug " + command.receiver + "," + command.name + "\r";
		if (commandString == "")
			console.log("Command is empty");
		if (commandString.length > 30) // because our Arduino script currently has an array for 30 bytes
			console.log("TOO LONG / TOO MANY COMMANDS, WE LOST BYTES ON THE WAY !!!");
			
		writeToArduino(commandString);
	});
	socket.on('clockTen', changeDataFile);
});