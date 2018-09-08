var config = {};

config.arduino = {};

config.arduino.baudRate = 9600;
config.arduino.mockingEnabled = true;
config.arduino.portPath ="/dev/ttyACM0";
config.arduino.readMeasurementsOnly = false;

module.exports = config;