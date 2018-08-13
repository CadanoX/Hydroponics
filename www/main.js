//import nouislider from 'nouislider';

var socket;
var buttonIsOn = [0, 0, 0, 0]; // keep track of the buttons for sockets and pumps
var wantedValue = {
	"tempAir": 42.5,
	"tempWater": 30,
	"humidity": 55,
	"CO2": 2500,
	"O2": 18,
	"EC": 2500,
	"PH": 7,
	"light": 1250,
	"SAL": 50
};
var currentRelay = 0;
var relays = [
	{
		"type": "none",
		"times": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	},
	{
		"type": "none",
		"times": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	},
	{
		"type": "none",
		"times": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	},
	{
		"type": "none",
		"times": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	}
];

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function relayChanged(relay)
{
	currentRelay = relay.value - 1;
	let timeButtons = document.querySelectorAll(".time-button");
	for (var i = 0; i < timeButtons.length; i++)
	{
		if (relays[currentRelay].times[i] == 1)
			timeButtons[i].classList.add("mdc-button--raised");
		else
			timeButtons[i].classList.remove("mdc-button--raised");
	}
}

function toggleRelayTimer(button, time)
{
	//button.style.backgroundColor = "red";
	button.classList.toggle("mdc-button--raised");
	relays[currentRelay].times[time] = button.classList.contains("mdc-button--raised");
}

function clockSignalFullHour(hour)
{
	for(var i = 0; i < relays.length; i++)
	{
		if (relays[i].times[hour])
		{
			if (i == 0)
				sendCommand('5', '1'); // set relay 1 to on
			else if (i == 1)
				sendCommand('6', '1'); // set relay 1 to on
		}
		else
		{
			if (i == 0)
				sendCommand('5', '0'); // set relay 1 to off
			else if (i == 1)
				sendCommand('6', '0'); // set relay 1 to off
		}
	}
}

//var commandQueue = [];
function Command(receiver, name)
{
	this.receiver = receiver;
	this.name = name;
}

function sendCommandToDevice(command)
{
	socket.emit('new command', command);
}
	
function sendCommand(receiver, command)
{
	sendCommandToDevice( new Command(receiver, command) );
}

let workaroundSliderJustFired = false;

// optimized for 8 cards
function calculateCardSize()
{	
	let con = document.getElementById('mainCardContainer');
	let spaceX = (con.clientWidth / 4) - 24; // 24 = the left + right margin of the cards
	let spaceY = (con.clientHeight / 2) - 24; // 24 = the left + right margin of the cards
	let size = Math.min(spaceX, spaceY);
	size = (size < 200) ? 200 : size; 
	//console.log(size);
	return size;
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
	socket = io();
	
	let cardContainer = document.getElementById('mainCardContainer');
	let cardTempAir = new Card(cardContainer, 'AirTemp', '&#8451;', -40, 125);
	let cardTempWater = new Card(cardContainer, 'WaterTemp', '&#8451;', 0, 60);
	let cardHumidity = new Card(cardContainer, 'Humidity', '%', 30, 80, 0);
	let cardCO2 = new Card(cardContainer, 'CO2', 'ppm', 0, 5000, 0);
	let cardO2 = new Card(cardContainer, 'Dissolved O2', 'mg/l', 0, 36);
	let cardEC = new Card(cardContainer, 'Conductivity', '&micro;S/cm', 0, 5000, 1, [0,1500,2100,2900,3500,5000]);
	let cardPh = new Card(cardContainer, 'pH', '/10', 0, 14, 1, [0,5,6.6,7.4,9,14]);
	let cardLight = new Card(cardContainer, 'Light PAR', '&micro;mol m<sup>-2</sup>s<sup>-1</sup>', 0, 2500, 0);
	let cardSAL = new Card(cardContainer, 'SAL', 'g/kg', 0, 36, 2)
	
	// react when the user changes the sliders value
	cardTempAir.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		wantedValue.tempAir = cardTempAir.getSliderValue();
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
		wantedValue.tempWater = cardTempWater.getSliderValue();
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
		wantedValue.humidity = cardHumidity.getSliderValue();
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
		wantedValue.CO2 = cardCO2.getSliderValue();
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
		wantedValue.O2 = cardO2.getSliderValue();
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
		wantedValue.EC = cardEC.getSliderValue();
		/* TODO: change the way the scale is given (e.g. without first and last value, because card has it already? or remove those 2 parameters from the card)
			maybe give the differences from the wanted value? (are they always symmetric?)
			make sure that wantedValue + X is not bigger than the maximum !!
		*/
		cardEC.setValueScale([
			0,
			wantedValue.EC - 1000,
			wantedValue.EC - 400,
			wantedValue.EC + 400,
			wantedValue.EC + 1000,
			5000]);
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
		wantedValue.PH = cardPh.getSliderValue();
		cardPh.setValueScale([
			0,
			wantedValue.PH - 2,
			wantedValue.PH - 0.4,
			wantedValue.PH + 0.4,
			wantedValue.PH + 2,
			14]);
		userChangedSlider("PH", cardPh.getSliderValue());
		workaroundSliderJustFired = true;
	});
	cardLight.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		wantedValue.light = cardLight.getSliderValue();
		userChangedSlider("light", cardLight.getSliderValue());
		workaroundSliderJustFired = true;
	});
	
	cardSAL.get().addEventListener('valueChanged', function(e)
	{
		if (workaroundSliderJustFired)
		{
			workaroundSliderJustFired = false;
			return;
		}
		wantedValue.SAL = cardSAL.getSliderValue();
		userChangedSlider("SAL", cardSAL.getSliderValue());
		workaroundSliderJustFired = true;
	});
	
	socket.on('new measurements', onMeasuresReceived);
	function onMeasuresReceived(measures)
	{
		if (!!measures.WaterTemp)
		{
			cardTempWater.setValue(measures.WaterTemp);
			measurementChanged("tempWater", measures.WaterTemp);
		}
		if (!!measures.Temp)
		{
			cardTempAir.setValue(measures.Temp);
			measurementChanged("tempAir", measures.Temp);
		}
		if (!!measures.EC)
		{
			cardEC.setValue(measures.EC);
			measurementChanged("EC", measures.EC);
		}
		if (!!measures.Humidity)
		{
			cardHumidity.setValue(measures.Humidity);
			measurementChanged("humidity", measures.Humidity);
		}
		if (!!measures.PH)
		{
			cardPh.setValue(measures.PH);
			measurementChanged("PH", measures.PH);
		}
		if (!!measures.SAL)
		{
			cardSAL.setValue(measures.SAL);
			measurementChanged("SAL", measures.SAL);
		}
	}
	
	const MDCToolbar = mdc.toolbar.MDCToolbar;
	const MDCToolbarFoundation = mdc.toolbar.MDCToolbarFoundation;
	const toolbar = new MDCToolbar(document.querySelector('.mdc-toolbar'));
	
	const dynamicTabBar = window.dynamicTabBar = new mdc.tabs.MDCTabBar(document.querySelector('#dynamic-tab-bar'));
	const panels = document.querySelector('.panels');

	dynamicTabBar.tabs.forEach(function(tab) {
		tab.preventDefaultOnClick = true;
	});

	function updatePanel(index)
	{
		let activePanel = panels.querySelector('.panel.active');
		if (activePanel) {
			activePanel.classList.remove('active');
		}
		let newActivePanel = panels.querySelector('.panel:nth-child(' + (index + 1) + ')');
		if (newActivePanel) {
			newActivePanel.classList.add('active');
		}
	}

	dynamicTabBar.listen('MDCTabBar:change', function ({detail: tabs})
	{
		let nthChildIndex = tabs.activeTabIndex;
		updatePanel(nthChildIndex);
	});

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
	let menu = new mdc.menu.MDCMenu(menuEl);
	document.querySelector('#menu-button').addEventListener('click', function (evt) {
		menu.open = !menu.open;
	});
	
	var slider = document.getElementById('slider');

noUiSlider.create(slider, {
	start: [20, 80],
	connect: true,
	range: {
		'min': 0,
		'max': 100
	}
});
	/*
	const MDCFormField = mdc.form-field.MDCFormField;
	const formField = new MDCFormField(document.querySelector('.mdc-form-field'));
	*/
	
	/*
	let selectEl = document.querySelector('.mdc-select')
	const select = new mdc.select.MDCSelect(selectEl);
	select.listen('change', () => {
		let a = select;
		alert(`Selected option at index ${select.selectedIndex} with value "${select.value}"`);
	});
	*/
	
	
	initClock();	
});