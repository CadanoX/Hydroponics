# README #

Optimal Loop Direction

### What is this repository for? ###

* Raspberry Pi 3 is connected to an Arduino Mega, which is connected to several sensors
* OLD reads and writes sensor data
* Raspberry runs a nodejs application, which runs a web server and allows communication over the serial channel to an Arduino
* Version 0.0

### How do I get set up? ###

* Setup node.js by executing the following commands:
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm install --save express serialport socket.io socket.io-client material-components-web mongodb

* For USB support do
Linux:
sudo apt-get install build-essential libudev-dev

Windows:
install http://zadig.akeo.ie/ USB drivers

then on both:
npm install usb

* Update all node.js modules
npm update

* Use PM2 to automatically run the application on startup
npm install pm2 -g
pm2 startup systemd
pm2 start app.js --watch
pm2 stop app.js
pm2 save

* In order to run the service without sudo:
sudo apt-get install authbind
sudo touch /etc/authbind/byport/80
sudo chown yourusername /etc/authbind/byport/80
sudo chmod 755 /etc/authbind/byport/80
authbind --deep pm2 update

And then use authbind --deep pm2 instead of pm2

### Additional information

* How to enable WiFi on raspberry via SD card
source: https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md

sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
add:
network={
    ssid="testing"
    psk="testingPassword"
}

* How to get out of kiosk mode
ctrl + W <OR> alt + F4	//closes kiosk
ctrl + alt + T	//opens terminal
sudo raspi-config	//open configuration

### Who do I talk to? ###

* fabian.bolte@web.de