import serial
import sys

numArg = len(sys.argv)

arduino = serial.Serial('/dev/ttyACM0',9600, timeout = 5)

if numArg > 1:
	arduino.write(sys.argv[1].encode())

read_serial = arduino.readline()

print read_serial
arduino.close()
