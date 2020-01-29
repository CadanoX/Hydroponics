# Hydroponics O.L.D.

Optimal Loop Direction was a project with the goal of developing a hydroponics system for private and industrial use. The project is discontinued and the source code is now openly available.

## Idea

The core of the device is a Raspberry Pi running a Node.js server. The
control interface is utilizing standard web technologies including HTML5,
CSS3, and JavasSript (ES6). It features Google's material design and
no-ui-slider. The Pi communicates to one or more Arduino devices via a
serial connection. Sensors send their measurements to their connected
Arduino, which forwards them to the Pi for further processing and storage.
Based on the incoming measurements and conditions, the Pi can send
commands to connected Arduinos to activate pumps or other devices. The web
interface enables the user to control under which conditions the device
should, e.g., pump fertilizer into the water, activate the heater, or
water the plants.

## Features

- Reading of sensor measurements
- Definition of optimal, acceptable, and critical ranges for each individual measurement
- Automatic adjustment of the environment to keep variables in their optimal range
- Measurement-based control of plugged in devices
- Time-based control of plugged in devices
- Manual control of plugged in devices
- Automatic storage of measurements for future analysis
- Automatic smoothing of measurements for predictable action
- Fine-grained control of storage and smoothing functionality
- Download of stored measurements to USB
- Upload of settings via USB

# Setup

Install [node.js](https://nodejs.org/en/download/package-manager/).

Or via the command line:

```sh
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install
```

For a first test run `node OLDServer.js` and open `localhost` in the browser.

# Additional information

How to enable WiFi on raspberry via SD card
source: https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md

```sh
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
```

add:

```
network={
    ssid="testing"
    psk="testingPassword"
}
```

For USB support:

- Linux:

```sh
sudo apt-get install build-essential libudev-dev
npm install --unsafe-perm usb
```

- Windows:
  - install http://zadig.akeo.ie/ USB drivers
  - `npm install usb`

Update all node.js modules:

```sh
npm update --unsafe-perm=true --allow-root
```

Use PM2 to automatically run the application on startup:

```sh
npm install pm2 -g
pm2 startup systemd
pm2 start app.js --watch
pm2 stop app.js
pm2 save
```

Run the service without sudo:

```sh
sudo apt-get install authbind
sudo touch /etc/authbind/byport/80
sudo chown yourusername /etc/authbind/byport/80
sudo chmod 755 /etc/authbind/byport/80
authbind --deep pm2 update
```

And then use `authbind --deep pm2` instead of `pm2`

How to get out of kiosk mode:

```
ctrl + W <OR> alt + F4	//closes kiosk
ctrl + alt + T	//opens terminal
sudo raspi-config	//open configuration
```

# License

Distributed under the MIT License. See `LICENSE` for more information.

# Contact

fabian.bolte@web.de

# Acknowledgement

I hereby want to thank Patrick Jahn, Florian Müller, and Hachem Melhem for their initiative and contribution to the O.L.D. project. They not only designed and built a functioning prototype device, but further provided valuable input for the software functionality and interface design.
