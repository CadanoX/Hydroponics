<?php
    if (isset($_POST['receiver']) && isset($_POST['command']))
	{
        sendCommand($_POST['receiver'], $_POST['command']);
    }
	
	function sendCommand($receiver, $command)
	{
		exec("python write_serial.py ".$receiver." ".$command, $readArray, $successful);
		echo $readArray[0];
		unset($readArray);
	}
?>
