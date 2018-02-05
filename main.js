var buttonIsOn = [0, 0, 0, 0]; // keep track of the buttons for sockets and pumps

var commandQueue = [];
function Command(receiver, name)
{
	this.receiver = receiver;
	this.name = name;
}

function sendCommand(receiver, command)
{
	commandQueue.push( new Command(receiver, command) );
}

let workaroundSliderJustFired = false;

// optimized for 8 cards
function resize()
{	
	let con = document.getElementById('mainCardContainer');
	let cards = document.querySelectorAll(".sensor-card");
	let spaceX = (con.clientWidth / 4) - 24; // 24 = the left + right margin of the cards
	let spaceY = (con.clientHeight / 2) - 24; // 24 = the left + right margin of the cards
	let size = Math.min(spaceX, spaceY);
	size = (size < 200) ? 200 : size; 
	console.log(size);
	for (i = 0; i < cards.length; i++)
	{
		cards[i].style.height = size + "px";
		cards[i].style.width = size + "px";
	}
}

function buttonClicked(button)
{
	switch(button.id)
	{
		case "pump1-button":
			buttonIsOn[0] = !buttonIsOn[0];				
			userClickedButton(button.id, buttonIsOn[0]);
			if (buttonIsOn[0])
				button.innerHTML = "hourglass_full";
			else
				button.innerHTML = "hourglass_empty";
		break;
		case "pump2-button":
			buttonIsOn[1] = !buttonIsOn[1];
			userClickedButton(button.id, buttonIsOn[1]);
			if (buttonIsOn[1])
				button.innerHTML = "hourglass_full";
			else
				button.innerHTML = "hourglass_empty";
		break;
		case "socket1-button":
			buttonIsOn[2] = !buttonIsOn[2];
			userClickedButton(button.id, buttonIsOn[2]);
			if (buttonIsOn[2])
				button.innerHTML = "label";
			else
				button.innerHTML = "label_outline";
		break;
		case "socket2-button":
			buttonIsOn[3] = !buttonIsOn[3];
			userClickedButton(button.id, buttonIsOn[3]);
			if (buttonIsOn[3])
				button.innerHTML = "label";
			else
				button.innerHTML = "label_outline";
		break;
		default:
		break;
	}
}

document.addEventListener("DOMContentLoaded", function(event)
{
	let cardContainer = document.getElementById('mainCardContainer');
	let cardTempAir = new Card(cardContainer, 'AirTemp', '&#8451;', -40, 125);
	let cardTempWater = new Card(cardContainer, 'WaterTemp', '&#8451;', 0, 60);
	let cardHumidity = new Card(cardContainer, 'Humidity', '%', 30, 80);
	let cardCO2 = new Card(cardContainer, 'CO2', 'ppm', 0, 5000);
	let cardO2 = new Card(cardContainer, 'Dissolved O2', 'mg/l', 0, 36);
	let cardEC = new Card(cardContainer, 'Conductivity', '&micro;S/cm', 0, 500000);
	let cardPh = new Card(cardContainer, 'pH', '/10', 0, 14);
	let cardLight = new Card(cardContainer, 'Light PAR', '&micro;mol m<sup>-2</sup>s<sup>-1</sup>', 0, 2500);
	
	resize();
	// react when the user changes the sliders value
	cardTempAir.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		userChangedSlider("tempAir", cardTempAir.getSliderValue());
		workaroundSliderJustFired = true;
	});
	cardTempWater.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		userChangedSlider("tempWater", cardTempWater.getSliderValue());
		workaroundSliderJustFired = true;
	});
	cardHumidity.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		userChangedSlider("humidity", cardHumidity.getSliderValue());
		workaroundSliderJustFired = true;
	});
	cardCO2.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		userChangedSlider("CO2", cardCO2.getSliderValue());
		workaroundSliderJustFired = true;
	});
	cardO2.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		userChangedSlider("O2", cardO2.getSliderValue());
		workaroundSliderJustFired = true;
	});
	cardEC.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		userChangedSlider("EC", cardEC.getSliderValue());
		workaroundSliderJustFired = true;
	});
	cardPh.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		userChangedSlider("Ph", cardPh.getSliderValue());
		workaroundSliderJustFired = true;
	});
	cardLight.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		userChangedSlider("light", cardLight.getSliderValue());
		workaroundSliderJustFired = true;
	});
	
	function getNewMeasurements()
	{
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'serial.php', true);

		// Track the state changes of the request.
		xhr.onreadystatechange = function ()
		{
			var DONE = 4; // readyState 4 means the request is done.
			var OK = 200; // status 200 is a successful return.
			if (xhr.readyState === DONE)
			{
				if (xhr.status === OK)
				{
					let measures = null;
					// decode the response
					try
					{
						measures = JSON.parse(xhr.responseText);
					}
					catch(e)
					{
						// byte errors, that destroy the format
						console.log(xhr.responseText);
						console.log(e);
					}
					if (measures)
					{
						console.log(measures)
						// TODO: check for byte errors in values
						if (measures.WaterTemp)
						{
							cardTempWater.setValue(measures.WaterTemp);
							measurementChanged("tempWater", measures.WaterTemp);
						}
						if (measures.Temp)
						{
							cardTempAir.setValue(measures.Temp);
							measurementChanged("tempAir", measures.Temp);
						}
						if (measures.EC)
						{
							cardEC.setValue(measures.EC);
							measurementChanged("EC", measures.EC);
						}
						if (measures.Humidity)
						{
							cardHumidity.setValue(measures.Humidity);
							measurementChanged("humidity", measures.Humidity);
						}
						if (measures.PH)
						{
							cardPh.setValue(measures.PH);
							measurementChanged("PH", measures.PH);
						}
					}
				}
				else
				{
					console.log('Error: ' + xhr.status); // An error occurred during the request.
				}
			}
		};
		
		xhr.send();
	}
	
	function sendCommand(receiver, command)
	{
		let data = new FormData();
		data.append('receiver', receiver);
		data.append('command', command);
		
		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'write_serial.php', true);

		// Track the state changes of the request.
		xhr.onreadystatechange = function ()
		{
			var DONE = 4; // readyState 4 means the request is done.
			var OK = 200; // status 200 is a successful return.
			if (xhr.readyState === DONE)
			{
				if (xhr.status === OK)
				{
					let measures = null;
					// decode the response
					try
					{
						measures = JSON.parse(xhr.responseText);
					}
					catch(e)
					{
						// byte errors, that destroy the format
						console.log(xhr.responseText);
						console.log(e);
					}
				}
				else
				{
					console.log('Error: ' + xhr.status); // An error occurred during the request.
				}
			}
		};
		
		xhr.send(data);
	}
	
	setInterval(function()
	{
		let command = commandQueue.pop();
		if (!!command)
			sendCommand(command.receiver, command.name);
		else
			getNewMeasurements();
		
		
		if (!!command)
			console.log("comm");
		else
			console.log("meas");
	}, 5000);
	
	const MDCToolbar = mdc.toolbar.MDCToolbar;
	const MDCToolbarFoundation = mdc.toolbar.MDCToolbarFoundation;
	const toolbar = new MDCToolbar(document.querySelector('.mdc-toolbar'));
	
	const MDCDialog = mdc.dialog.MDCDialog;
	const MDCDialogFoundation = mdc.dialog.MDCDialogFoundation;
	const util = mdc.dialog.util;
	
	let dialog = new mdc.dialog.MDCDialog(document.querySelector('#mdc-dialog-shutdown'));

	dialog.listen('MDCDialog:accept', function() {
		console.log('shut down');
	});

	dialog.listen('MDCDialog:cancel', function() {
		console.log('shut down canceled');
	});

	document.querySelector('#power-button').addEventListener('click', function (evt) {
		dialog.lastFocusedTarget = evt.target;
		dialog.show();
	});
	
	
	let menuEl = document.querySelector('#menu');
	let menu = new mdc.menu.MDCSimpleMenu(menuEl);
	document.querySelector('#menu-button').addEventListener('click', function (evt) {
		menu.open = !menu.open;
	});
	
	initClock();	
});
