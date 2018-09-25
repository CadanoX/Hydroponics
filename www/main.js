var socket;
var buttonIsOn = [0, 0, 0, 0]; // keep track of the buttons for sockets and pumps
var cards = {};

var values = {
	"Temp": {
		"min": -40,
		"max": 125,
		"name": "AirTemp",
		"scale": [0, 33, 38, 47, 52, 80],
		"unit": '&#8451;',
		"wanted": 42.5
	},
	"WaterTemp": {
		"min": 0,
		"max": 60,
		"name": "WaterTemp",
		"scale": [0,20,25,35,40,60],
		"unit": '&#8451;',
		"wanted": 30
	},
	"Humidity":  {
		"decimals": 0,
		"min": 30,
		"max": 80,
		"name": "Humidity",
		"scale": [30,45,50,60,65,80],
		"unit": '%',
		"wanted": 55
	},
	"CO2": {
		"decimals": 0,
		"min": 0,
		"max": 5000,
		"name": "CO2",
		"scale": [0,1500,2100,2900,3500,5000],
		"unit": 'ppm',
		"wanted": 2500
	},
	"O2": {
		"min": 0,
		"max": 36,
		"name": "Dissolved O2",
		"scale": [0,12,15,21,23,36],
		"unit": 'mg/l',
		"wanted": 18
	},
	"EC": {
		"min": 0,
		"max": 5000,
		"name": "Conductivity",
		"scale": [0,1500,2100,2900,3500,5000],
		"unit": '&micro;S/cm',
		"wanted": 2500
	},
	"PH": {
		"min": 0,
		"max": 14,
		"name": "pH",
		"scale": [0,5,6.6,7.4,9,14],
		"unit": '/10',
		"wanted": 7
	},
	"light": {
		"decimals": 0,
		"min": 0,
		"max": 2500,
		"name": "Light PAR",
		"scale": [0,800,1100,1400,1700,2500],
		"unit": '&micro;mol m<sup>-2</sup>s<sup>-1</sup>',
		"wanted": 1250
	},
	"SAL": {
		"decimals": 2,
		"min": 0,
		"max": 100,
		"name": "SAR",
		"scale": [0,40,45,55,60,100],
		"unit": 'g/kg',
		"wanted": 50
	}
};
var relays = [
	{
		"type": "none",
		"control": "Manual",
		"scales": {},
		"times": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	},
	{
		"type": "none",
		"control": "Manual",
		"scales": {},
		"times": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	},
	{
		"type": "none",
		"control": "Manual",
		"scales": {},
		"times": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	},
	{
		"type": "none",
		"control": "Manual",
		"scales": {},
		"times": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	}
];

var pumps = [
	{
		"control": "Manual",
		"scales": {}
	}
];

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function relayOptionChanged(relay, option)
{

	relays[relay].control = option.value;
	const relayOptionDiv = document.querySelector("#device-" + relay + " .option");

	if (option.value == "Manual")
	{
		relayOptionDiv.querySelector(".manualSwitch").style.display = "block";
		relayOptionDiv.querySelector(".timeButtonContainer").style.display = "none";
		relayOptionDiv.querySelector(".optionSlider").style.display = "none";
		const slider = relayOptionDiv.querySelector(".manualSlider");
		slider.style.display = "block";

		if (slider.noUiSlider.get() == "0")
		{
			sendCommand("relay-" + relay, "0");
			relays[relay].isActive = false;
		}
		else
		{
			sendCommand("relay-" + relay, "1");
			relays[relay].isActive = true;
		}


	}
	else if (option.value == "Time")
	{
		relayOptionDiv.querySelector(".manualSwitch").style.display = "none";
		relayOptionDiv.querySelector(".timeButtonContainer").style.display = "block";
		relayOptionDiv.querySelector(".optionSlider").style.display = "none";

		// test if the relay should be on, based on the time configuration
		clockSignalFullHour(new Date().getHours());
	}
	else
	{
		relayOptionDiv.querySelector(".manualSwitch").style.display = "none";
		relayOptionDiv.querySelector(".timeButtonContainer").style.display = "none";
		const slider = relayOptionDiv.querySelector(".optionSlider");
		slider.style.display = "block";
		if (!relays[relay].scales[option.value])
			// copy scale from default to specific device
			relays[relay].scales[option.value] = values[option.value].scale.slice(0);
		const scale = relays[relay].scales[option.value];
		const handles = scale.slice(1, scale.length-1);

		slider.noUiSlider.updateOptions({
			start: handles,
			connect: (new Array(handles.length+1)).fill(true),
			range: {
				'min': scale[0],
				'max': scale[scale.length-1]
			}
		}, true);
	}
	
	//
	/*
	let timeButtons = document.querySelectorAll(".time-button");
	for (var i = 0; i < timeButtons.length; i++)
	{
		if (relays[currentRelay].times[i] == 1)
			timeButtons[i].classList.add("mdc-button--raised");
		else
			timeButtons[i].classList.remove("mdc-button--raised");
	}
	*/
}

function toggleRelayTimer(button)
{
	button.classList.toggle("mdc-button--raised");
	relays[button.device].times[button.time] = button.classList.contains("mdc-button--raised");

	// test if the new configuration should toggle the relay
	let currentHour = (new Date()).getHours();
	if (button.time == currentHour)
		clockSignalFullHour(currentHour);
}

//TODO: move clock signals to server !! or they will be triggered by each client
function clockSignalFullHour(hour)
{
	for(var i = 0; i < relays.length; i++)
	{
		if (relays[i].control == "Time")
		{
			if (relays[i].times[hour])
				sendCommand('relay-' + i, '1'); // set relay i to on
			else
				sendCommand('relay-' + i, '0'); // set relay i to off
		}
	}
}

function clockSignalTenMinutes()
{
	socket.emit('clockTen');
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
	for (var v in values)
	{
		cards[v] = new Card(cardContainer, values[v].name, values[v].unit, values[v].min, values[v].max, values[v].decimals, values[v].scale);
	}
	// react when the user changes the sliders value
	for (var c in cards)
	{
		cards[c].get().addEventListener('valueChanged', function(e)
		{
			if (workaroundSliderJustFired)
			{
				workaroundSliderJustFired = false;
				return;
			}
			values[c].wanted = cards[c].getSliderValue();
			userChangedSlider(c, cards[c].getSliderValue());
			workaroundSliderJustFired = true;
		});
	}
	
	socket.on('new measurements', onMeasuresReceived);
	function onMeasuresReceived(measures)
	{
		for (var m in measures)
		{
			if (!!cards[m])
			{
				cards[m].setValue(measures[m]);
				measurementChanged(m, measures[m])
			}
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
		
		if (index == 1)
		{
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
	
	// set up controls
	const controls = document.querySelector("#controlOptions table");
	for (var r in relays)
	{
		const row = document.createElement("tr");
		row.id = "device-" + r;
		const col1 = document.createElement("td");
		const col2 = document.createElement("td");
		const col3 = document.createElement("td");
		controls.appendChild(row);
		row.appendChild(col1);
		row.appendChild(col2);
		row.appendChild(col3);

		col1.innerText = "Relay " + r;
		col2.innerHTML =`
			<div class="mdc-select mdc-select--box">
				<select class="mdc-select__native-control" onchange="relayOptionChanged(${r}, this)">
					<option value="Manual" selected>Manual</option>
					<option value="Time">Time</option>
					<option value="Temp">Air temp</option>
					<option value="WaterTemp">Water temp</option>
					<option value="Humidity">Humidity</option>
					<option value="CO2">CO2</option>
					<option value="O2">O2</option>
					<option value="EC">EC</option>
					<option value="PH">PH</option>
					<option value="Light">Light</option>
					<option value="SAL">SAL</option>
					
					<label class="mdc-floating-label mdc-floating-label--float-above">Choose an option</label>
					<div class="mdc-line-ripple"></div>
				</select>
			</div>
		`;
		col3.classList += "option";

		// create toggle for manually controlling devices
		const manualSwitch = document.createElement("div");
		manualSwitch.classList.add("manualSwitch");
		manualSwitch.style.display = "block";
		col3.appendChild(manualSwitch);

		const manualSlider = document.createElement("div");
		manualSlider.classList.add("manualSlider");
		manualSwitch.appendChild(manualSlider);

		noUiSlider.create(manualSlider, {
			start: 0,
			range: {
				'min': [0, 1],
				'max': 1
			},
			connect: [true, true],
			format: wNumb({
				decimals: 0
			})
		});

		manualSlider.noUiSlider.device = r;
		manualSlider.noUiSlider.on('change', function (values, handle) {
			if (values[handle] === '1') {
				manualSlider.classList.add('off');
				sendCommand("relay-" + this.device, "1");
				relays[this.device].isActive = true;
			} else {
				manualSlider.classList.remove('off');
				sendCommand("relay-" + this.device, "0");
				relays[this.device].isActive = false;
			}
		});

		// create buttons for controlling the time dependency
		const timeButtonContainer = document.createElement("div");
		timeButtonContainer.classList.add("timeButtonContainer");
		col3.appendChild(timeButtonContainer);
		timeButtonContainer.style.display = "none";
		const timeButtonContainerMorning = document.createElement("div");
		timeButtonContainer.appendChild(timeButtonContainerMorning);
		const timeButtonContainerEvening = document.createElement("div");
		timeButtonContainer.appendChild(timeButtonContainerEvening);

		for (var i = 0; i < 24; i++)
		{
			const timeButton = document.createElement("div");
			timeButton.classList.add("mdc-button");
			timeButton.classList.add("time-button");
			timeButton.type = "button";
			timeButton.time = i;
			timeButton.device = r;
			timeButton.onclick = () => toggleRelayTimer(timeButton);
			timeButton.innerHTML = ((i + 11) % 12 + 1) + ((i < 12) ? "am" : "pm");
			(i < 12) ? timeButtonContainerMorning.appendChild(timeButton) : timeButtonContainerEvening.appendChild(timeButton);
		}

		// create slider for controlling the dependency of measured values
		const slider = document.createElement("div");
		col3.appendChild(slider);
		slider.classList.add("optionSlider");
		slider.style.display = "none";
		noUiSlider.create(slider, {
			start: [10, 30, 50, 80],
			connect: [true, true, true, true, true],
			tooltips: [ true, true, true, true ],	
			range: {
				'min': 0,
				'max': 100
			},
			pips: {
				mode: 'count',
				values: 5,
				density: 2.5
			}
		});
		slider.noUiSlider.device = r;
		slider.noUiSlider.on('change', function()
		{
			const option = relays[this.device].control;
			// replace the inner values of the devices scale by the new scale
			let arr = relays[this.device].scales[option];
			Array.prototype.splice.apply(arr, [1, this.get().length].concat(this.get()));
			// convert the array to an array of numbers
			for (var i = 0; i < arr.length; i++) 
				arr[i] = +arr[i];
			// copy the new array to the default values, so that they are used as the new default
			values[option].scale = arr.slice(0);
			// set the value scale of the according measurement card
			cards[option].setValueScale(arr);
		});

	}


	/*
	const MDCFormField = mdc.formField.MDCFormField;
	let formFieldDiv = document.querySelector('#controlOptions .mdc-form-field');
	let formField = new MDCFormField(formFieldDiv);
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