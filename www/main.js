var devices; // Store current control settings for each device
var cards = {}; // Current measurements are displayed on cards

// Set up communication with server
socket = io();

// Show current settings stored on the server
// If another client adjusts the settings, they will update as well
socket.on("settingsApplied", (deviceSettings) => {
  devices = deviceSettings;
  renderSettings();
});

// Show new measurements to user
socket.on("new measurements", onMeasuresReceived);
function onMeasuresReceived(measures) {
  for (var m in measures) {
    if (!!cards[m]) {
      cards[m].setValue(measures[m]);
    }
  }
}

function cancelOptions() {
  // Receive previous settings from server
  socket.emit("settingsCancelled", devices);
}

function saveOptions() {
  // Send new settings to server
  socket.emit("settingsChanged", devices);
}

/* We have 2 types of devices: Pumps and Relays
 * The number (nr) separates multiple devices of the same type
 * Each device can be controlled through 3 main mechanisms: 1 Manual, 2 Measurement, or 3 Time
 * 1 Manually turn the device on or off
 * 2 Set a scale for one tracked measurement (pH, EC). If the measurement is outside of its
 * comfort zone (green), the device will be activated. Based on how far off the value is, the
 * device will be turned on for, e.g., 1 second (orange) or 2 seconds (red)
 * 3 Set hours of the day during which the device is supposed to be on or off.
 */
function deviceOptionChanged(type, nr, option) {
  let device = devices[type][nr];
  device.control = option;
  const deviceOptionDiv = document.querySelector(
    "#" + type + "-" + nr + " .option"
  );
  const manualSwitch = deviceOptionDiv.querySelector(".manualSwitch");
  const timeButtonContainer = deviceOptionDiv.querySelector(
    ".timeButtonContainer"
  );
  const optioslidernSlider = deviceOptionDiv.querySelector(".optionSlider");
  const deviceOptionDir = document.querySelector(
    "#" + type + "-" + nr + " .optionDirSelection"
  );

  if (device.control == "Manual") {
    // Hide all controls but manual
    manualSwitch.style.display = "block";
    timeButtonContainer.style.display = "none";
    slider.style.display = "none";
    deviceOptionDir.style.display = "none";
    const manualSlider = deviceOptionDiv.querySelector(".manualSlider");
    manualSlider.style.display = "block";

    device.manualSwitch = slider.noUiSlider.get();
  } else if (device.control == "Time") {
    // Hide all controls but time
    manualSwitch.style.display = "none";
    timeButtonContainer.style.display = "block";
    slider.style.display = "none";
    deviceOptionDir.style.display = "none";
  } else {
    // control by measurement
    // Hide all controls but measurement scale
    manualSwitch.style.display = "none";
    timeButtonContainer.style.display = "none";
    deviceOptionDir.style.display = "inline";
    slider.style.display = "block";

    // If device does not have its own scale defined, copy default scale
    if (!device.scales[device.control])
      device.scales[device.control] = values[device.control].scale.slice(0);

    // Get and set the controlDir in the GUI
    let lastControlDir = deviceOptionDir.querySelector("select").value;
    deviceOptionDir.querySelector("select").value = device.controlDir;

    // Create the slider for this scale
    // The scale can control too high values (+), too low values (-), or both
    // A scale with 6 values has 5 value area (critical, bad, good, bad, critical)
    // The scale ranges from the first to the last value.
    // Intermediate values define transition values between value areas
    // Each transition value can be adjusted by a handle
    // If a scale has a direction (+ or -), only half the scale is shown (critical, bad, good)
    const scale = device.scales[device.control];
    let handles;
    let numHandles = scale.length - 2;
    let numHandlesPlus = Math.floor(numHandles / 2);
    if (device.controlDir == "+") {
      handles = scale.slice(
        scale.length - 1 - numHandlesPlus,
        scale.length - 1
      );
      slider.classList.add("plus");
    } else if (device.controlDir == "-") {
      handles = scale.slice(1, scale.length - 1 - numHandlesPlus);
      slider.classList.remove("plus");
    } else {
      handles = scale.slice(1, scale.length - 1);
      slider.classList.remove("plus");
    }

    if (device.controlDir == lastControlDir)
      updateDeviceOptionSlider(slider, handles);
    else {
      slider.noUiSlider.destroy();
      createSlider(slider, type, nr, handles);
    }
  }
}

function createSlider(div, type, nr, handles = [10, 30, 50, 80]) {
  let device = devices[type][nr];
  const scale = device.scales[device.control];

  if (!scale) range = [0, 100];
  else range = [scale[0], scale[scale.length - 1]];

  noUiSlider.create(div, {
    start: handles,
    connect: new Array(handles.length + 1).fill(true),
    tooltips: new Array(handles.length).fill(true),
    range: {
      min: range[0],
      max: range[1],
    },
    pips: {
      mode: "count",
      values: 5,
      density: 2.5,
    },
  });
  div.noUiSlider.device = { type: type, nr: nr };
  div.noUiSlider.on("change", sliderHandleChanged);
}

function sliderHandleChanged() {
  // Update handles of the scale
  const device = devices[this.device.type][this.device.nr];
  let arr = device.scales[device.control];

  // Only update relevant values
  // On a 6 value scale, value 0 and 5 defined the possible value range
  // values 1 and 2 define low value handles
  // values 3 and 4 define high value handles
  if (device.controlDir == "+")
    Array.prototype.splice.apply(arr, [3, 2].concat(this.get()));
  else if (device.controlDir == "-")
    Array.prototype.splice.apply(arr, [1, 2].concat(this.get()));
  else Array.prototype.splice.apply(arr, [1, 4].concat(this.get()));

  // Convert the array to an array of numbers
  for (var i = 0; i < arr.length; i++) arr[i] = +arr[i];
  // Copy the new array to the default values, so that they are used as the new default
  values[device.control].scale = arr.slice(0);
  // Set the value scale of the according measurement card
  cards[device.control].setValueScale(arr);
}

function updateDeviceOptionSlider(slider, handles) {
  let device =
    devices[slider.noUiSlider.device.type][slider.noUiSlider.device.nr];
  const scale = device.scales[device.control];

  // Adjust the slider to the given scale
  slider.noUiSlider.updateOptions(
    {
      start: handles,
      connect: new Array(handles.length + 1).fill(true),
      range: {
        min: scale[0],
        max: scale[scale.length - 1],
      },
    },
    true
  );
}

// Adjust the slider when the user changes the control directory (+/-)
// TODO: refactor - same code as in deviceOptionChanged
function deviceOptionDirChanged(type, nr, option) {
  let device = devices[type][nr];
  device.controlDir = option.value;
  const deviceOptionDiv = document.querySelector(
    "#" + type + "-" + nr + " .option"
  );
  const slider = deviceOptionDiv.querySelector(".optionSlider");
  const scale = device.scales[device.control];

  let handles;
  let numHandles = scale.length - 2;
  let numHandlesPlus = Math.floor(numHandles / 2);
  if (device.controlDir == "+") {
    handles = scale.slice(scale.length - 1 - numHandlesPlus, scale.length - 1);
    slider.classList.add("plus");
  } else if (device.controlDir == "-") {
    handles = scale.slice(1, scale.length - 1 - numHandlesPlus);
    slider.classList.remove("plus");
  } else {
    handles = scale.slice(1, scale.length - 1);
    slider.classList.remove("plus");
  }

  slider.noUiSlider.destroy();
  createSlider(slider, type, nr, handles);
}

function toggleRelayTimer(button) {
  button.classList.toggle("mdc-button--raised");
  devices[button.device.type][button.device.nr].times[
    button.time
  ] = button.classList.contains("mdc-button--raised");
}

let workaroundSliderJustFired = false;

// Automatically calculate an appropriate card size based on the display size
// Optimized for 8 cards
// TODO: Switch to grid layout
function calculateCardSize() {
  let con = document.getElementById("mainCardContainer");
  let spaceX = con.clientWidth / 4 - 24; // 24 = the left + right margin of the cards
  let spaceY = con.clientHeight / 2 - 24; // 24 = the left + right margin of the cards
  let size = Math.min(spaceX, spaceY);
  size = size < 200 ? 200 : size;
  //console.log(size);
  return size;
}

function renderSettings() {
  // set up controls
  const controls = document.querySelector("#controlOptions table");
  // delete old settings
  controls.querySelectorAll("tr:not(.header)").forEach((d) => d.remove());
  // show current settings
  for (var type in devices) {
    devices[type].forEach((device, nr) => {
      const row = document.createElement("tr");
      row.id = type + "-" + nr;
      const col1 = document.createElement("td");
      const col2 = document.createElement("td");
      const col3 = document.createElement("td");
      controls.appendChild(row);
      row.appendChild(col1);
      row.appendChild(col2);
      row.appendChild(col3);

      col1.innerText = type + " " + nr;

      let selectString = `
				<div class="mdc-select mdc-select--box">
					<select class="mdc-select__native-control" onchange="deviceOptionChanged('${type}', '${nr}', this.value)">
						<option value="Manual" selected>Manual</option>`;

      if (type == "relay")
        selectString += `
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
				`;
      else if (type == "pump")
        selectString += `
						<option value="PH">PH</option>
						<option value="EC">EC</option>
						<option value="O2">O2</option>
				`;

      selectString += `
						<label class="mdc-floating-label mdc-floating-label--float-above">Choose an option</label>
						<div class="mdc-line-ripple"></div>
					</select>
				</div>
			`;

      // define +/- direction of control
      selectString += `
				<div class="mdc-select mdc-select--box optionDirSelection">
					<select class="mdc-select__native-control" onchange="deviceOptionDirChanged('${type}', '${nr}', this)">
						<option value="+/-" selected>+/-</option>
						<option value="+">+</option>
						<option value="-">-</option>
						
						<label class="mdc-floating-label mdc-floating-label--float-above">Choose direction</label>
						<div class="mdc-line-ripple"></div>
					</select>
				</div>
			`;

      col2.innerHTML = selectString;
      col2.querySelector("select").value = device.control;
      col2.querySelector(".optionDirSelection").value = device.controlDir;

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
          min: [0, 1],
          max: 1,
        },
        connect: [true, true],
        format: wNumb({
          decimals: 0,
        }),
      });

      manualSlider.noUiSlider.device = { type: type, nr: nr };
      manualSlider.noUiSlider.on("change", function (values, handle) {
        devices[this.device.type][this.device.nr].manualSwitch = values[handle];
      });

      manualSlider.noUiSlider.set(device.manualSwitch);

      // create buttons for controlling the time dependency
      const timeButtonContainer = document.createElement("div");
      timeButtonContainer.classList.add("timeButtonContainer");
      col3.appendChild(timeButtonContainer);
      timeButtonContainer.style.display = "none";
      const timeButtonContainerMorning = document.createElement("div");
      timeButtonContainer.appendChild(timeButtonContainerMorning);
      const timeButtonContainerEvening = document.createElement("div");
      timeButtonContainer.appendChild(timeButtonContainerEvening);

      for (var i = 0; i < 24; i++) {
        const timeButton = document.createElement("div");
        timeButton.classList.add("mdc-button");
        timeButton.classList.add("time-button");
        timeButton.type = "button";
        timeButton.time = i;
        timeButton.device = { type: type, nr: nr };
        timeButton.onclick = () => toggleRelayTimer(timeButton);
        timeButton.innerHTML = ((i + 11) % 12) + 1 + (i < 12 ? "am" : "pm");
        i < 12
          ? timeButtonContainerMorning.appendChild(timeButton)
          : timeButtonContainerEvening.appendChild(timeButton);

        if (!!device.times && device.times[i]) toggleRelayTimer(timeButton);
      }

      // create slider for controlling the dependency of measured values
      const slider = document.createElement("div");
      col3.appendChild(slider);
      slider.classList.add("optionSlider");
      slider.style.display = "none";
      createSlider(slider, type, nr);

      deviceOptionChanged(type, nr, device.control);
    });
  }
}

function renderCards() {
  // Draw one card per measured value
  let cardContainer = document.getElementById("mainCardContainer");
  for (var v in values) {
    cards[v] = new Card(
      cardContainer,
      values[v].name,
      values[v].unit,
      values[v].min,
      values[v].max,
      values[v].decimals,
      values[v].scale
    );

    // When the user changes the sliders value, adjust the wanted value on the card
    cards[v].get().addEventListener("valueChanged", function (e) {
      // Ignore multiple calls
      if (workaroundSliderJustFired) {
        workaroundSliderJustFired = false;
        return;
      }
      values[v].wanted = cards[v].getSliderValue();
      userChangedSlider(c, cards[v].getSliderValue());
      workaroundSliderJustFired = true;
    });
  }
}

function renderInterface() {
  const MDCToolbar = mdc.toolbar.MDCToolbar;
  const MDCToolbarFoundation = mdc.toolbar.MDCToolbarFoundation;
  const toolbar = new MDCToolbar(document.querySelector(".mdc-toolbar"));

  const dynamicTabBar = (window.dynamicTabBar = new mdc.tabs.MDCTabBar(
    document.querySelector("#dynamic-tab-bar")
  ));
  const panels = document.querySelector(".panels");

  dynamicTabBar.tabs.forEach(function (tab) {
    tab.preventDefaultOnClick = true;
  });

  function updatePanel(index) {
    let activePanel = panels.querySelector(".panel.active");
    if (activePanel) {
      activePanel.classList.remove("active");
    }
    let newActivePanel = panels.querySelector(
      ".panel:nth-child(" + (index + 1) + ")"
    );
    if (newActivePanel) {
      newActivePanel.classList.add("active");
    }
  }

  dynamicTabBar.listen("MDCTabBar:change", function ({ detail: tabs }) {
    let nthChildIndex = tabs.activeTabIndex;
    updatePanel(nthChildIndex);
  });

  const MDCDialog = mdc.dialog.MDCDialog;
  const MDCDialogFoundation = mdc.dialog.MDCDialogFoundation;
  const util = mdc.dialog.util;

  let dialog = new mdc.dialog.MDCDialog(
    document.querySelector("#mdc-dialog-shutdown")
  );

  dialog.listen("MDCDialog:accept", function () {
    console.log("shut down");
  });

  dialog.listen("MDCDialog:cancel", function () {
    console.log("shut down canceled");
  });

  document
    .querySelector("#power-button")
    .addEventListener("click", function (evt) {
      dialog.lastFocusedTarget = evt.target;
      dialog.show();
    });

  let menuEl = document.querySelector("#menu");
  let menu = new mdc.menu.MDCMenu(menuEl);
  document
    .querySelector("#menu-button")
    .addEventListener("click", function (evt) {
      menu.open = !menu.open;
    });

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
}

document.addEventListener("DOMContentLoaded", function (event) {
  renderInterface();
  renderCards();

  // Display the current time
  new Clock(document.getElementById("clock"));
});
