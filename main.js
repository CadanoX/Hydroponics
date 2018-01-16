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
	
	// react when the user changes the sliders value
	cardTempAir.get().addEventListener('valueChanged', function(e) {
		console.log(cardTempAir.getSliderValue());
		//sendCommand("test");
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
					try {
						measures = JSON.parse(xhr.responseText);
					}
					catch(e) {
						// byte errors, that destroy the format
						console.log(xhr.responseText);
						console.log(e);
					}
					if (measures)
					{
						console.log(measures)
						// TODO: check for byte errors in values
						if (measures.WaterTemp)
							cardTempWater.setValue(measures.WaterTemp);
						if (measures.Temp)
							cardTempAir.setValue(measures.Temp);
						if (measures.EC)
							cardEC.setValue(measures.EC);
						if (measures.Humidity)
							cardHumidity.setValue(measures.Humidity);
						if (measures.PH)
							cardPh.setValue(measures.PH);
					}
				} else {
					console.log('Error: ' + xhr.status); // An error occurred during the request.
				}
			}
		};
		
		xhr.send();
	}
	
	function sendCommand(command, param = "")
	{
		let data = new FormData();
		data.append('commandName', command);
		data.append('param', param);
		
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
					
				} else {
					console.log('Error: ' + xhr.status); // An error occurred during the request.
				}
			}
		};
		
		xhr.send(data);
	}
	
	setInterval(function() {
		// test setValue
		//let ran = Math.random()*100;
		//cardTempAir.setValue(ran);
		getNewMeasurements();
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
