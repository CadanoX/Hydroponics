import serial

arduino = serial.Serial('/dev/ttyACM0',9600, timeout = 5)
arduino.write(b'1')
s = [0,1]
read_serial = arduino.readline()
#s[0] = str(int (arduino.readline(),16))
#print s[0]
print read_serial
arduino.close()
