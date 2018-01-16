<?php
//function getMeasurements()
//{
	// read twice, because the first reading has byte errors more often
    exec("python read_serial.py", $readArray, $successful);
    unset($readArray);
    exec("python read_serial.py", $readArray, $successful);
//$measures = json_decode($readArray[0], true);
	//echo $measures;
	echo $readArray[0];
    unset($readArray);
//}
?>
