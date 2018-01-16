import serial
import sys

numArg = len(sys.argv)
if numArg > 1:
	arduino = serial.Serial('/dev/ttyACM0',9600)
	commandString = sys.argv[1] + " " sys.argv[2]
	arduino.write(commandString.encode())
	#arduino.write(b'1')
	arduino.close()
