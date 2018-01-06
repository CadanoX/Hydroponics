"use strict";

(function ()
{
	// constructor
	function Card(div, title, unit, valueMin, valueMax)
	{
		//let value = null;
		let containerDiv = div;
		
		let card = document.createElement("div");
		card.classList = "mdc-card sensor-card";
		containerDiv.appendChild(card);
		
		createLayout(card, title, unit, valueMin, valueMax);
		
		let buttonDiv = card.querySelector(".sensor-card-button");
		let sliderDiv = card.querySelector(".sensor-card-slider");
		let outputDiv = card.querySelector(".sensor-card-form-field");
		let valueDiv = card.querySelector(".sensor-card__value");
		let slider;
		
		// hide slider, show button -- this needs to be delayed, to make positioning and sizes right
		setTimeout(function() {
			buttonDiv.style.display = "inline";
			sliderDiv.style.display = "none";
		}, 0);
			
		let {MDCSlider} = mdc.slider;
		slider = new MDCSlider(sliderDiv);
		let valueChangedEvent = new CustomEvent('valueChanged', {detail: { value: slider.value }});
		
		/* values don't need to be set, if they are defined in DOM already
		slider.max = valueMax;
		slider.min = valueMin;
		slider.value = valueMin + (valueMax - valueMin) / 2;
		*/
		slider.listen('MDCSlider:input', function ()
		{
			// set form field text to new value
			outputDiv.childNodes[0].value = slider.value;
		});
		slider.listen('MDCSlider:change', function ()
		{
			// hide slider, show button
			buttonDiv.style.display = "inline";
			sliderDiv.style.display = "none";
			card.dispatchEvent(valueChangedEvent);
		});
		
		buttonDiv.onclick = function() {
			// hide button
			buttonDiv.style.display = "none";
			// show slider
			sliderDiv.style.display = "inline";
			/*
			// define slider values
			let {MDCSlider} = mdc.slider;
			let slider = new MDCSlider(sliderDiv);
			slider.max = valueMax;
			slider.min = valueMin;
			slider.value = valueMin + (valueMax - valueMin) / 2;
			*/
		}
		
		this.get = function() { return card; }
		this.getSliderValue = function() { return slider.value; }

		this.setValue = function(newValue)
		{
			let val = Number.parseInt(newValue);
			if (Number.isNaN(val)) {
				console.log("value is not a number");
				return;
			}
			if (val < valueMin || val > valueMax) {
				console.log("value is out of range");
				return;
			}
			valueDiv.innerHTML = val;
		}
	};

	// private shared functions
	function createLayout(card, title, unit, valueMin, valueMax)
	{
		let startValue = valueMin + (valueMax - valueMin) / 2;
		
		let cardHeader = document.createElement("section");
		cardHeader.classList = "sensor-card__header";
		card.appendChild(cardHeader);
		
		let cardPrimary = document.createElement("section");
		cardPrimary.classList = "mdc-card__primary";
		card.appendChild(cardPrimary);
		
			let cardTitle = document.createElement("h1");
			cardTitle.classList = "mdc-card__title mdc-card__title--large";
			cardTitle.innerHTML = title;
			cardPrimary.appendChild(cardTitle);
		
		let cardMeasurement = document.createElement("section");
		cardMeasurement.classList = "sensor-card__measurement";
		card.appendChild(cardMeasurement);
		
			let cardValue = document.createElement("span");
			cardValue.classList = "sensor-card__value";
			cardValue.innerHTML = "-";
			cardMeasurement.appendChild(cardValue);
			
			let cardUnit = document.createElement("span");
			cardUnit.classList = "sensor-card__unit";
			cardUnit.innerHTML = unit;
			cardMeasurement.appendChild(cardUnit);
		
		let cardActions = document.createElement("section");
		cardActions.classList = "mdc-card__actions";
		card.appendChild(cardActions);
		
			let cardSlider = document.createElement("div");
			cardSlider.classList = "mdc-slider mdc-slider--discrete sensor-card-slider";
			cardSlider.setAttribute('tabindex', '0');
			cardSlider.setAttribute('role', 'slider');
			cardSlider.setAttribute('aria-valuemin', valueMin);
			cardSlider.setAttribute('aria-valuemax', valueMax);
			cardSlider.setAttribute('aria-valuenow', startValue);
			cardSlider.setAttribute('data-step', 0.5);
			cardSlider.setAttribute('aria-label', 'Select Value');
			cardActions.appendChild(cardSlider);
			
				let cardSliderTrackContainer = document.createElement("div");
				cardSliderTrackContainer.classList = "mdc-slider__track-container";
				cardSlider.appendChild(cardSliderTrackContainer);
				
					let cardSliderTrack = document.createElement("div");
					cardSliderTrack.classList = "mdc-slider__track";
					cardSliderTrackContainer.appendChild(cardSliderTrack);
					
				let cardSliderThumbContainer = document.createElement("div");
				cardSliderThumbContainer.classList = "mdc-slider__thumb-container";
				cardSlider.appendChild(cardSliderThumbContainer);
				
					let cardSliderPin = document.createElement("div");
					cardSliderPin.classList = "mdc-slider__pin";
					cardSliderThumbContainer.appendChild(cardSliderPin);
					
						let cardSliderPinMarker = document.createElement("span");
						cardSliderPinMarker.classList = "mdc-slider__pin-value-marker";
						cardSliderPin.appendChild(cardSliderPinMarker);
						
					let cardSliderThumb = document.createElement("svg");
					cardSliderThumb.classList = "mdc-slider__thumb";
					cardSliderThumb.setAttribute('width', '21');
					cardSliderThumb.setAttribute('height', '21');
					cardSliderThumbContainer.appendChild(cardSliderThumb);
					
						let cardSliderThumbCircle = document.createElement("circle");
						cardSliderThumbCircle.setAttribute('cx', '10.5');
						cardSliderThumbCircle.setAttribute('cy', '10.5');
						cardSliderThumbCircle.setAttribute('r', '7.875');
						cardSliderThumb.appendChild(cardSliderThumbCircle);
						
					let cardSliderFocusRing = document.createElement("div");
					cardSliderFocusRing.classList = "mdc-slider__focus-ring";
					cardSliderThumbContainer.appendChild(cardSliderFocusRing);
					
			let cardButton = document.createElement("button");
			cardButton.classList = "mdc-button mdc-button--stroked mdc-button--compact mdc-card__action sensor-card-button";
			cardButton.innerHTML = "Set value";
			cardActions.appendChild(cardButton);
			
			let cardFormField = document.createElement("div");
			cardFormField.classList = "mdc-form-field sensor-card-form-field";
			cardActions.appendChild(cardFormField);
			
				let cardFormFieldText = document.createElement("input");
				cardFormFieldText.type = "text";
				cardFormFieldText.value = startValue;
				cardFormFieldText.readOnly = true;
				cardFormFieldText.size = "2";
				cardFormField.appendChild(cardFormFieldText);
		
		let cardFooter = document.createElement("section");
		cardFooter.classList = "mdc-card__footer";
		card.appendChild(cardFooter);
	}
	
	// Expose object
	window.Card = Card;
})();