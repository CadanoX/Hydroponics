import serial
import sys

numArg = len(sys.argv)
if numArg > 1:
	arduino = serial.Serial('/dev/ttyACM0',9600)
	arduino.write(sys.argv[1].encode())
	#arduino.write(b'1')
	arduino.close()
