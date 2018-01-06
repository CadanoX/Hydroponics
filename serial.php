<?php
//function getMeasurements()
//{
    exec("python read_serial.py", $readArray, $successful);
	//$measures = json_decode($readArray[0], true);
	echo $measures;
    unset($readArray);
//}
?>
