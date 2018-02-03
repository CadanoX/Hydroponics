/* Commands are described by a receiver (pump or sensor) and the command to send
 * receivers are listed by number:
 * 1 = pH
 * 2 = EC
 * 3 = pump
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


function userChangedSlider(sliderName, value)
{
	switch(sliderName)
	{
		case "tempAir":
			console.log("Slider " + sliderName + " changed to value " + value);
			commandQueue.push( new Command("3", "1,1000") );
		break;
		case "tempWater":
			console.log("Slider " + sliderName + " changed to value " + value);
		break;
		case "humidity":
			console.log("Slider " + sliderName + " changed to value " + value);
		break;
		case "CO2":
			console.log("Slider " + sliderName + " changed to value " + value);
		break;
		case "O2":
			console.log("Slider " + sliderName + " changed to value " + value);
		break;
		case "EC":
			console.log("Slider " + sliderName + " changed to value " + value);
		break;
		case "Ph":
			console.log("Slider " + sliderName + " changed to value " + value);
		break;
		case "light":
			console.log("Slider " + sliderName + " changed to value " + value);
		break;
		default:
			console.log("Slider " + sliderName + " does not exist.");
		break;
	}
}

function measurementChanged(measurement, value)
{
	switch(sliderName)
	{
		case "tempAir":
		break;
		case "tempWater":
		break;
		case "humidity":
		break;
		case "EC":
		break;
		case "Ph":
		break;
		default:
			console.log("Measurement " + measurement + " does not exist.");
		break;
	}
}