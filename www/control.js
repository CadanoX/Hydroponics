/* Commands are described by a receiver (sensor, pump or relay) and the command to send
 * receivers are enumerated:
 * sensor-0 = pH
 * sensor-1 = EC
 * pump-0
 * pump-1
 * relay-0
 * relay-1
 *
 * sensors have predefined commands, described in their documentation, e.g.:
 * C,1 = read the sensors value every second
 * Cal,mid,7.00 = calibrate the sensor's mid pH value to 7.00
 *
 * for pumps we use self-defined commandos:
 * 1 = on
 * 1,1000 = on for 1000 ms
 * 0 = off
 *
 * A command to put the pump on for 5 seconds would look like:
 * pump-0 1,5000
 *
 * A command to set the EC sensors name would look like:
 * sensor-1 Name,Thomas
 */
 
 var time = 0;
function userClickedButton(button, isOn)
{
	//console.log("User clicked button " + button);
	switch(button)
	{
		case "pump1-button":
			if (isOn)
				sendCommand("pump-0", "1");
			else
				sendCommand("pump-0", "0");
		break;
		case "pump2-button":
			if (isOn)
				sendCommand("pump-1", "1");
			else
				sendCommand("pump-1", "0");
		break;
		case "socket1-button":
			if (isOn)
			{
				devices["relay"][0].isActive = true;
				sendCommand("relay-0", "1");
			}
			else
			{
				sendCommand("relay-0", "0");
				devices["relay"][1].isActive = false;
			}				
		break;
		case "socket2-button":
			if (isOn)
			{
				devices["relay"][1].isActive = true;
				sendCommand("relay-1", "1");
			}
			else
			{
				devices["relay"][1].isActive = false;
				sendCommand("relay-1", "0");
			}
		break;
		default:
			console.log("Button " + button + " does not exist.");
		break;
	}
}

function userChangedSlider(sliderName, value)
{	
	//console.log("Slider " + sliderName + " changed to value " + value);
	/*switch(sliderName)
	{
		case "tempAir":
		break;
		case "tempWater":
		break;
		case "humidity":
		break;
		case "CO2":
		break;
		case "O2":
		break;
		case "EC":
		break;
		case "PH":
		break;
		case "light":
		break;
		case "SAL":
		break;
		default:
			console.log("Slider " + sliderName + " does not exist.");
		break;
	}
	*/
}

function measurementChanged(measurement, value)
{
	for (type in devices)
	{
		devices[type].forEach( (device, nr) =>
		{
			if (device.control == measurement)
			{
				if (type == "relay")
				{
					if (value < device.scales[measurement][2]
						|| value > device.scales[measurement][3])
					{ // activate relay
						if (!device.isActive) {
							sendCommand(type + '-' + nr, "1");
							device.isActive = true;
						}
					}
					else // deactivate relay
					{
						if (device.isActive) {
							sendCommand(type + '-' + nr, "0");
							device.isActive = false;
						}
					}
				}
				else // pump				
				{
					if (device.isActive)
						return;

					// IMPORTANT: Currently scale might not be ordered,
					//so don't check if the value is in the middle range ( val > measure 2 && val < measure 3),
					// but check for + and - scales individually, if the value is inside their red ranges
					// check upper scale
					if (device.controlDir == "+/-" || device.controlDir == "+")
						if (value < device.scales[measurement][3])
							return;

					// check lower scale
					if (device.controlDir == "+/-" || device.controlDir == "-")
						if (value > device.scales[measurement][2])
							return;

					let curTime = Date.now();
					console.log(curTime - time);
					time = curTime;

					//activate pump
					sendCommand(type + '-' + nr, "1");
					device.isActive = true;
				
					let duration; // time the pump will stay active
					if (value < device.scales[measurement][1] || value > device.scales[measurement][4])
						duration = 2000;
					else if (value < device.scales[measurement][2] || value > device.scales[measurement][3])
						duration = 1000;
					
					// deactivate pump after "duration" seconds
					setTimeout((type, nr) => { sendCommand(type + '-' + nr, "0"); }, duration, type, nr);
					// pause the pump for 2 minutes
					let pause = 0.5 * 60000;

					setTimeout((device) => {
						device.isActive = false;
					}, pause, device);
				}
			}
		});
	}
	
	/*
	switch(measurement)
	{
		case "Temp":
		break;
		case "WaterTemp":
		break;
		case "Humidity":
		break;
		case "EC":
			if (value < values.EC.scale[2])
				sendCommand("3", "1,3000");
			else if (value > values.EC.scale[4])
				sendCommand("4", "1,3000");
		break;
		case "PH":
			if (value < values.PH.scale[1])
				sendCommand("3", "1,2000");
			else if (value < values.PH.scale[2])
				sendCommand("3", "1,1000");
			else if (value > values.PH.scale[4])
				sendCommand("4", "1,2000");
			else if (value > values.PH.scale[3])
				sendCommand("4", "1,1000");
		break;
		case "SAL":
			if (value < values.SAL.wanted)
				console.log("SAL is smaller than the user wants");
			else if (value > values.SAL.wanted)
				console.log("SAL is bigger than the user wants");
			else
				console.log("SAL is perfect");
		break;
		default:
			console.log("Measurement " + measurement + " does not exist.");
		break;
	}
	*/
}