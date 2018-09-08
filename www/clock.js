function initClock()
{
	var clockElement = document.getElementById( "clock" );

	function updateClock(clock) {
		let date = new Date();
		clock.innerHTML = date.toLocaleTimeString();
		if (date.getMinutes() == 0)
			clockSignalFullHour(date.getHours());
		if ((date.getMinutes()%10) == 0)
			clockSignalTenMinutes();
	}

	setInterval(function () {
		updateClock(clockElement);
	}, 1000);
};