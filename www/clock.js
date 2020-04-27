/*
This class is used to display the time, as well as to
trigger functions on a regular basis.
*/
class Clock {
  constructor(div) {
    this._div = div; // Div to render time to
    this._date; // Current date
    this._callbackHour; // Function to be called every hour
    this._callbackMinute; // Function to be called every minute
    this._callbackSecond; // Function to be called every second

    this.init();
  }

  set displayDiv(div) {
    this._div = div;
  }
  set callbackEveryHour(callback) {
    this._callbackHour = callback;
  }
  set callbackEveryMinute(callback) {
    this._callbackMinute = callback;
  }
  set callbackEverySecond(callback) {
    this._callbackSecond = callback;
  }

  init() {
    // Update the clock every second
    setInterval(() => this._update(), 1000);
  }

  _update() {
    this._date = new Date();

    // Render time to the user interface
    if (this._div) this._div.innerHTML = this._date.toLocaleTimeString();

    // Every full hour, send a signal with the current hour
    if (this._date.getMinutes() == 0 && this._callbackHour)
      this._callbackHour(date.getHours());
    if (this._date.getSeconds() == 0 && this._callbackMinute)
      this._callbackMinute(date.getMinutes());
    if (this._callbackSecond) this._callbackSecond();
  }
}

if (typeof exports === "object") module.exports = Clock;
