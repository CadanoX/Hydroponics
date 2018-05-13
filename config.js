var config = {};

config.arduino = {};

config.arduino.serialPortModule = "serialport/test";
config.arduino.mockingEnabled = true;
config.arduino.portPath ="/dev/ttyACM0";
config.arduino.baudRate = 9600;

module.exports = config;