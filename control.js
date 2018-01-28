function userChangedSlider(sliderName, value)
{
	switch(sliderName)
	{
		case "tempAir":
			console.log("Slider " + sliderName + " changed to value " + value);
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