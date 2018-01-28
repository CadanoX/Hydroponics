<?php
    if (isset($_POST['command']) && isset($_POST['args']))
	{
        sendCommand($_POST['command'], $_POST['args']);
    }
	
	function sendCommand($name, $arguments)
	{
		exec("python write_serial.py ".$name." ".$arguments, $readArray, $successful);
		echo $readArray[0];
		unset($readArray);
	}
?>
