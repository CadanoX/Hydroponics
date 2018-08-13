/*
var config = require('./config');

// web server
const express = require('express')
const app = express()
const server = require('http').Server(app);
// client communication
const io = require('socket.io')(server)
// database
const Mongod = require('mongod');
const MongoClient = require('mongodb').MongoClient;
var DB = { initialized: false };
*/
import {config} from './config';
import express from 'express';
import http from'http';
import io from 'socket.io';
import mongod from'mongod';
import * as mongodb from 'mongodb';
import * as fs from'fs';
import serialport from 'serialport/test';
const FILENAME = typeof __filename !== 'undefined' ? __filename : (/^ +at (?:file:\/*(?=\/)|)(.*?):\d+:\d+$/m.exec(Error().stack) || '')[1];
console.log(FILENAME)
const DIRNAME = typeof __dirname !== 'undefined' ? __dirname : FILENAME.replace(/[\/\\][^\/\\]*?$/, '');
console.log(DIRNAME)

const app = express();
const server = http.Server(app);
const IO = io(server);
const MongoClient = mongodb.MongoClient;
var DB = { initialized: false };

// arduino communication
const mockArduino = config.arduino.mockingEnabled; // emulate an arduino, in case you got no arduino connected
//const SerialPort = mockArduino ? require("serialport/test") : require("serialport");
var arduinoPortPath = config.arduino.portPath;
var arduinoBaudrate = config.arduino.baudRate;
const MockBinding = serialport.Binding; // Test base when no arduino is connected

// file system
//const fs = require('fs');

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
		if (err) {
			return console.log('Error on write: ', err.message);
		}
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
			if (measures.Temp)
				storeMeasurement("Temp", measures.Temp);
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
		let commandString = command.receiver + " " + command.name;
		if (commandString == "")
			console.log("Command is empty");
		if (commandString.length > 30) // because our Arduino script currently has an array for 30 bytes
			console.log("TOO LONG / TOO MANY COMMANDS, WE LOST BYTES ON THE WAY !!!");
			
		writeToArduino(commandString);
	});
});