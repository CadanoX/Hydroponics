/* Commands are described by a receiver (pump or sensor) and the command to send
 * receivers are listed by number:
 * 1 = pH
 * 2 = EC
 * 3 = pump 1
 * 4 = pump 2
 * 5 = socket 1
 * 6 = socket 2
 *
 * sensors have predefined commands, described in their documentation, e.g.:
 * C,1 = read the sensors value every second
 * Cal,mid,7.00 = calibrate the sensor's mid pH value to 7.00
 *
 * for pumps we use self-defined commandos:
 * 1,1000 = on for 1000 ms
 * 0 = off
 *
 * A command to put the pump on for 5 seconds would look like:
 * 3 1,5000
 *
 * A command to set the EC sensors name would look like:
 * 2 Name,Thomas
 */
 
function userClickedButton(button, isOn)
{
	//console.log("User clicked button " + button);
	switch(button)
	{
		case "pump1-button":
			if (isOn)
				sendCommand("3", "1");
			else
				sendCommand("3", "0");
		break;
		case "pump2-button":
			if (isOn)
				sendCommand("4", "1");
			else
				sendCommand("4", "0");
		break;
		case "socket1-button":
			if (isOn)
				sendCommand("5", "1");
			else
				sendCommand("5", "0");				
		break;
		case "socket2-button":
			if (isOn)
				sendCommand("6", "1");
			else
				sendCommand("6", "0");	
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
	switch(measurement)
	{
		case "tempAir":
		break;
		case "tempWater":
		break;
		case "humidity":
		break;
		case "EC":
			if (value < wantedValue.EC - 450)
				sendCommand("3", "1,3000");
			else if (value > wantedValue.EC + 450)
				sendCommand("4", "1,3000");
		break;
		case "PH":
			if (value < wantedValue.PH - 2)
				sendCommand("3", "1,2000");
			else if (value < wantedValue.PH - 0.4)
				sendCommand("3", "1,1000");
			else if (value > wantedValue.PH + 2)
				sendCommand("4", "1,2000");
			else if (value > wantedValue.PH + 0.4)
				sendCommand("4", "1,1000");
		break;
		case "SAL":
			if (value < wantedValue.SAL)
				console.log("SAL is smaller than the user wants");
			else if (value > wantedValue.SAL)
				console.log("SAL is bigger than the user wants");
			else
				console.log("SAL is perfect");
		break;
		default:
			console.log("Measurement " + measurement + " does not exist.");
		break;
	}
}