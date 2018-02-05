<?php
    if (isset($_POST['commandString']))
	{
        sendCommand($_POST['commandString']);
    }
	
	function sendCommand($commandString)
	{
		exec("python write_serial.py ".$commandString, $readArray, $successful);
		echo $readArray[0];
		unset($readArray);
	}
?>
