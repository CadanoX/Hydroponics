<?php
    if (isset($_POST['command']) && isset($_POST['param']))
	{

        sendCommand($_POST['command'], $_POST['param']);

    }
	
	function sendCommand($name, $param1)
	{
		exec("python write_serial.py ".$name." ".$param, $readArray, $successful);
		echo $readArray[0];
		unset($readArray);
	}
?>
