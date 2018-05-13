function initClock()
{
	var clockElement = document.getElementById( "clock" );

	function updateClock(clock) {
		clock.innerHTML = new Date().toLocaleTimeString();
	}

	setInterval(function () {
		updateClock(clockElement);
	}, 1000);
};