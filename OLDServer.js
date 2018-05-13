var config = require('./config');
// web server
const express = require('express')
const app = express()
const server = require('http').Server(app);
// arduino communication
const SerialPort = require(config.arduino.serialPortModule); // remove /test, if not mocking
const mockArduino = config.arduino.mockingEnabled; // emulate an arduino, in case you got no arduino connected
var arduinoPortPath = config.arduino.portPath;
var arduinoBaudrate = config.arduino.baudRate;
// Test base when no arduino is connected
const MockBinding = SerialPort.Binding;
// file system
const fs = require('fs');
// client communication
const io = require('socket.io')(server)


/* CREATE WEB SERVER */
app.use(express.static(__dirname + '/old')); // show where the web site lies
app.use('/scripts', express.static(__dirname + '/node_modules/material-components-web/dist/'));
app.get('/', handler);
server.listen(80, () => console.log('OLD server running on port 80!'));

function handler (req, res)
{
	//read file index.html in public folder
	res.sendfile(__dirname + 'index.html');
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
			io.emit('new measurements', measures);
	}
}

/* ESTABLISH ARDUINO CONNECTION */
if (mockArduino)
{
	arduinoPortPath = "arduinoMock";
	MockBinding.createPort(arduinoPortPath, { echo: true, record: false });
}
const arduino = new SerialPort(arduinoPortPath, {
	baudRate: arduinoBaudrate
});
const arduinoParser = arduino.pipe(new SerialPort.parsers.Readline({ delimiter: '\r\n' }));

// WHEN CONNECTION IS ESTABLISHED
arduino.on("open", function ()
{
	console.log('Established connection to Arduino');
	//writeToArduino('test');
	//setInterval(() => writeToArduino('{"WaterTemp":    0.000,"Humidity":  450.000,"Temp":    0.000,"EC":  844.100,"TDS":  455.000,"SAL":    0.410,"GRAV":    1.000}\r\n'), 3000);
});

// when Arduino is sending data
/*arduino.on('data', function(data)
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
io.sockets.on('connection', function (socket)
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