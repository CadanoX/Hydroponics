//This code was written to be easy to understand.
//Code efficiency was not considered.
//Modify this code as you see fit.
//This code will output data to the Arduino serial monitor.
//Type commands into the Arduino serial monitor to control the pH circuit.
//This code was written in the Arduino 1.6.5 IDE
//An Arduino UNO was used to test this code.

/*
 * 
 * 
 */
#include <SoftwareSerial.h>                           //we have to include the SoftwareSerial library, or else we can't use it
// Temp Air + Humidity
#include <DHT.h>
// Temp Water
#include <OneWire.h>
#include <DallasTemperature.h>

#define phRx 13                                          //define what pin rx is going to be
#define phTx 12                                          //define what pin tx is going to be
#define ecRx 11                                          //define what pin rx is going to be
#define ecTx 10                                          //define what pin tx is going to be
#define DHTRx 8
#define tempWaterRx 9
#define relay1Pin 2
#define relay2Pin 3
#define pump1Pin1 4 // pump pH increase
#define pump1Pin2 5 // pump pH increase
#define pump2Pin1 6 // pump pH decrease
#define pump2Pin2 7 // pump pH decrease

String inputstring = "";                              //a string to hold incoming data from the PC
boolean input_string_complete = false;                //have we received all the data from the PC
float humidity = 450;
float tempAir;
float tempWater;

int timeLast = 0;
int timeCur = 0;
int timeDiff = 0;
int dhtLast = 0;
int dhtDelay = 1000;
int sensorSwitch = 0; // can only read one SoftwareSensor at a time. This defines which one is currently active

bool newMeasurements = false;

// pH
class PhSensor
{
public:
  // set rx and tx on construction
  PhSensor(int rx, int tx, int baudrate)
  {
    serial = new SoftwareSerial(rx, tx);
    serial->begin(baudrate);                            //set baud rate for the software serial port to 9600
    output.reserve(30);                           //set aside some bytes for receiving data from Atlas Scientific product
  }
  ~PhSensor()
  {
    delete serial;
  }
  //void init () { }

  void listen()
  {
    serial->listen();
  }
  
  void check()
  {
    if (serial->available() > 0)                     //if we see that the Atlas Scientific product has sent a character
    {
	  //Serial.println("reading PH");
      char inchar = (char)serial->read();              //get the char we just received
      output += inchar;                           //add the char to the var called sensorstring
      // if the output is complete
      if (inchar == '\r')
      {
        if (isdigit(output[0])) {
			char buffer[10];
			output.toCharArray(buffer, 10);
			pH = atof(buffer);
			  //pH = output.toFloat();
			newMeasurements = true;
			output = "";                                //clear the string
			newMeasurements = true;
        }
      }
    }
  }

  float getValue()
  {
	newMeasurements = false;
	return pH;
  }

  void write(String input)
  {
    Serial.print("input: ");
    Serial.print(input);
    
    serial->print(input);                      //send that string to the Atlas Scientific product
    serial->print('\r');                             //add a <CR> to the end of the string
  }

  String output = "";                             //a string to hold the data from the Atlas Scientific product
  bool newMeasurements = false;
  
private:
  SoftwareSerial* serial;
  float pH = 0;
};

// describing an EC sensor
class EcSensor
{
public:
  // set rx and tx on construction
  EcSensor(int rx, int tx, int baudrate)
  {
    serial = new SoftwareSerial(rx, tx);
    serial->begin(baudrate);                            //set baud rate for the software serial port to 9600
    output.reserve(30);                           //set aside some bytes for receiving data from Atlas Scientific product
  }
  ~EcSensor()
  {
    delete serial;
  }
  //void init () { }

  void listen()
  {
    serial->listen();
  }

  void check()
  {
    if (serial->available() > 0)                     //if we see that the Atlas Scientific product has sent a character
    {
	
	  //Serial.println("reading EC");
      char inchar = (char)serial->read();              //get the char we just received
      output += inchar;                           //add the char to the var called sensorstring
      // if the output is complete
      if (inchar == '\r')
      {
        if (isdigit(output[0]) == false) {          //if the first character in the string is not a digit
          Serial.println(output);                   //send that string to the PC's serial monitor
        }
        else                                              //if the first character in the string is a digit
        {
          char output_array[30];                        //we make a char array
          output.toCharArray(output_array, 30);   //convert the string to a char array
          char* sEC = strtok(output_array, ",");               //let's pars the array at each comma
          char* sTDS = strtok(NULL, ",");                            //let's pars the array at each comma
          char* sSAL = strtok(NULL, ",");                            //let's pars the array at each comma
          char* sGRAV = strtok(NULL, ",");                           //let's pars the array at each comma
        
          /*
		  Serial.print("EC:");                                //we now print each value we parsed separately
          Serial.print(EC);                                 //this is the EC value
        
          Serial.print("TDS:");                               //we now print each value we parsed separately
          Serial.print(TDS);                                //this is the TDS value
        
          Serial.print("SAL:");                               //we now print each value we parsed separately
          Serial.print(SAL);                                //this is the salinity value
        
          Serial.print("GRAV:");                              //we now print each value we parsed separately
          Serial.print(GRAV);                               //this is the specific gravity
          //Serial.println();                                   //this just makes the output easier to read
		  */
        
          EC = atof(sEC);
          TDS = atof(sTDS);
          SAL = atof(sSAL);
          GRAV = atof(sGRAV);
		  newMeasurements = true;
        }
        output = "";                                //clear the string
      }
    }
  }

  float getValue()
  {
    newMeasurements = false;
	return EC;
  }
  
  void write(String input)
  {
    Serial.print("input: ");
    Serial.print(input);
    
    serial->print(input);                      //send that string to the Atlas Scientific product
    serial->print('\r');                             //add a <CR> to the end of the string
  }

  String output = "";                             //a string to hold the data from the Atlas Scientific product
  bool newMeasurements = false;
  float TDS = 0; 
  float SAL = 0; 
  float GRAV = 0;
  
private:
  SoftwareSerial* serial;
  float EC = 0; 
};

//class describing a pump
class Pump                                           
{
public:
  //constructor sets pin, on which the pump is located
  Pump(int pin, int pin2 = -1) : pin(pin), pin2(pin2)
  {
	pinMode(pin, OUTPUT);                    //set pump pins as output to be able to write to it
	digitalWrite(pin, LOW);
	if (pin2 != -1) {
		pinMode(pin2, OUTPUT);
		digitalWrite(pin2, LOW);
	}
  }                                    
                            
  int pin;
  int pin2;
  
  void check()
  {
    //Serial.print("Pump state: ");
    //Serial.println(state);
    
    if (state == 0) //pump is idling
      return;

    //Serial.print("Pump timer: ");
    //Serial.println(timer);
      
    if (timer > 0)
      timer -= timeDiff;
    else
    {
      if (state == 1) // runtime ran off, so stop the pump and pause for 30 sec
      {
        stop();
      }
      else
        state = 0; // reset the pump to idle state
    }
  }
  
  //let the pump run for "runtime" milliseconds and then stop
  void start(int runtime = 1000)                              
  {
    if (state != 0)                      //dont start pump when it is already running or in pause state
    {
       //Serial.println("Pump is already running or on pause.");
       return;
    }

    //Serial.println("EC.Low.PumpOn.");
    digitalWrite(pin, HIGH);
    state = 1;
    timer = runtime;
  }
  void stop()
  {
    //Serial.println("EC.Read.PumpOff.");
    digitalWrite(pin, LOW);
	state = 0;
	/* this will pause the pump, which means that calling start() doesn't do anything, while paused
	// arduino is just the executing, not the logical unit --> don't decide this here
    state = 2;
    timer = 30 * 1000;
	*/
  }
  
private:
  int state = 0;                                      // 0 = idle, 1 = running, 2 = pausing
  int timer = 0;
};

// DS18B20
class TempWaterSensor
{
public:
  // set rx and tx on construction
  TempWaterSensor(int rx, int timeDelay = 1000)
  {
    this->timeDelay = timeDelay;
    oneWire = new OneWire(rx);
    sensor = new DallasTemperature(oneWire);
    sensor->begin();
	sensor->requestTemperatures();
	temperature = sensor->getTempCByIndex(0);
  }
  ~TempWaterSensor()
  {
    delete sensor;
    delete oneWire;
  }

  void check()
  {
      if ((timeLast + timeDelay - timeCur) < 0) // if more time than timeDelay was spent
      {
        timeLast = timeCur;
        sensor->requestTemperatures();
        temperature = sensor->getTempCByIndex(0);
        /*
		Serial.print("Water temp: ");
        Serial.print(temperature);
		*/
		newMeasurements = true;
      }
  }

  int timeLast = 0;
  int timeDelay = 0;
  float temperature = 0;
private:
  OneWire* oneWire;
  DallasTemperature* sensor;
};


Pump pumpPhIncr(pump1Pin1, pump1Pin2);
Pump pumpPhDecr(pump2Pin1, pump2Pin2);
EcSensor ecSensor(ecRx, ecTx, 9600);
PhSensor phSensor(phRx, phTx, 9600);
DHT dht(DHTRx, DHT22);
TempWaterSensor tempWaterSensor(tempWaterRx);

void checkDht()
{
  if ((dhtLast + dhtDelay - timeCur) < 0) // if more time than dhtDelay was spent
  {
    dhtLast = timeCur;
    humidity = dht.readHumidity();
    tempAir = dht.readTemperature();
    /*
	Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.print(" %, Temp: ");
    Serial.print(tempAir);
    Serial.print(" Celsius");
	*/
	newMeasurements = true;
  }
}

void executeCommand(int receiver, char* command)
{

    Serial.print(receiver);
	Serial.print(",");
	Serial.println(command);
	if (command == NULL)
		return;
	
	switch(receiver)
	{
		case 1: // pH sensor
			phSensor.write(command);
		break;
		case 2: // EC sensor
			ecSensor.write(command);
		break;
		case 3: // pump
		{
			char* com = strtok(command, ","); // read command
			char* arg = strtok(NULL, " "); // read argument
			int comNum = atoi(com);
			int millisec = atoi(arg);
			if (comNum == 0)
				pumpPhIncr.stop();
			else if (comNum == 1) // put pump on
			{
				if(millisec) {
					pumpPhIncr.start(millisec);
				}
				else
					pumpPhIncr.start();
			}
		}
		break;
		case 4: // pump
		{
			char* com = strtok(command, ","); // read command
			char* arg = strtok(NULL, " "); // read argument
			int comNum = atoi(com);
			int millisec = atoi(arg);
			if (comNum == 0)
				pumpPhDecr.stop();
			else if (comNum == 1) // put pump on
			{
				if(millisec) {
					pumpPhDecr.start(millisec);
				}
				else
					pumpPhDecr.start();
			}
		}
		break;
		case 5: // relay1
		{
			char* com = strtok(command, ","); // read command
			int comNum = atoi(com);
			if (comNum == 0) // turn relay off
				digitalWrite(relay1Pin, HIGH);
			else if (comNum == 1) // turn relay on
				digitalWrite(relay1Pin, LOW);
		}
		break;
		case 6: // relay2
		{
			char* com = strtok(command, ","); // read command
			int comNum = atoi(com);
			if (comNum == 0) // turn relay off
				digitalWrite(relay2Pin, HIGH);
			else if (comNum == 1) // turn relay on
				digitalWrite(relay2Pin, LOW);
		}
		break;
		default:
		break;
	}
}

void setup() {                                        //set up the hardware
  Serial.begin(9600);                                 //set baud rate for the hardware serial port_0 to 9600
  inputstring.reserve(10);                            //set aside some bytes for receiving data from the PC

  dht.begin();
  humidity = dht.readHumidity();
  tempAir = dht.readTemperature();
  
  pinMode(relay1Pin, OUTPUT);
  pinMode(relay2Pin, OUTPUT);
  digitalWrite(relay1Pin, HIGH);
  digitalWrite(relay2Pin, HIGH);
}

void serialEvent() {                                  //if the hardware serial port_0 receives a char
  inputstring = Serial.readStringUntil(13);           //read the string until we see a <CR>
  input_string_complete = true;                       //set the flag used to tell if we have received a completed string from the PC
}

void loop()     	                                  //here we go...
{
  timeLast = timeCur;
  timeCur = millis();
  timeDiff = timeCur - timeLast;

  if (input_string_complete)                  	      //if a string from the PC has been received in its entirety
  {
    Serial.println(inputstring);
	char input_array[30];
	inputstring.toCharArray(input_array, 30);			  //convert the string to a char array
	char* receiver = strtok(input_array, " ");               //let's pars the array at each comma
	char* command = strtok(NULL, " ");
	executeCommand(atoi(receiver), command);
	
    inputstring = "";                                 //clear the string
    input_string_complete = false;                    //reset the flag used to tell if we have received a completed string from the PC
  }

  // only check one software sensor at a time
  if (sensorSwitch == 0)
  {
    phSensor.listen();	
	phSensor.check();
	if (phSensor.newMeasurements)
	{
	  //Serial.println("new PH");
	  sensorSwitch = 1;
	}
  }
  // don't "else if", so that we can, in the best case, read both sensors in one go
  if (sensorSwitch == 1)
  {
    ecSensor.listen();
    ecSensor.check();
	if (ecSensor.newMeasurements)
	{
	  //Serial.println("new EC");
	  sensorSwitch = 0;
	}
  }
  phSensor.check();
  
  pumpPhIncr.check();
  pumpPhDecr.check();

  checkDht();
  tempWaterSensor.check();
  
  // only print message when all sensor were read
  if (newMeasurements
	  && phSensor.newMeasurements
	  && ecSensor.newMeasurements
	 )
  {
	// send measurements to raspberry in JSON format
	
	String message;
	char floatHelp[10];

	message += '{';
	
	message += "\"WaterTemp\": ";
	dtostrf(tempWaterSensor.temperature, 8, 3, floatHelp);
	message += floatHelp;
	message += ",";
	
	message += "\"Humidity\": ";
	dtostrf(humidity, 8, 3, floatHelp);
	message += floatHelp;
	message += ",";
	
  	message += "\"Temp\": ";
	dtostrf(tempAir, 8, 3, floatHelp);
	message += floatHelp;
	message += ",";

	if(phSensor.newMeasurements)
	{
		message += "\"PH\": ";
		dtostrf(phSensor.getValue(), 8, 3, floatHelp);
		message += floatHelp;
		message += ",";
	}
	
	if(ecSensor.newMeasurements)
	{
		message += "\"EC\": ";
		dtostrf(ecSensor.getValue(), 8, 3, floatHelp);
		message += floatHelp;
		message += ",";
	}
	
	message += "\"TDS\": ";
	dtostrf(ecSensor.TDS, 8, 3, floatHelp);
	message += floatHelp;
	message += ",";
	
	message += "\"SAL\": ";
	dtostrf(ecSensor.SAL, 8, 3, floatHelp);
	message += floatHelp;
	message += ",";
	
	message += "\"GRAV\": ";
	dtostrf(ecSensor.GRAV, 8, 3, floatHelp);
	message += floatHelp;
	
	message += '}';
	
	Serial.println(message); // write a newline after all sensors were read
	Serial.flush(); // wait until the string was sent?
	newMeasurements = false;
  }

  //pumpPhIncr.start(250);
  //delay(TIMESTEP);

  /*
      
    Serial.println(sensorstring);                     //send that string to the PC's serial monitor
    if (isdigit(sensorstring[0]))                    //if the first character in the string is a digit
    {
      pH = sensorstring.toFloat();                    //convert the string to a floating point number so it can be evaluated by the Arduino
      if (pH < 5.0)
        pumpPhIncr.start(2500);
      else if (pH < 5.5)
        pumpPhIncr.start(1500);
      else if (pH < 5.7)
        pumpPhIncr.start(1000);
      else if (pH > 7.0)
        pumpPhDecr.start(1500);
      else if (pH > 6.5)
        pumpPhDecr.start(1500);
      else if (pH > 6.3)
        pumpPhDecr.start(1000);
      
    }
    else
    {
      print_EC_data();
    }
    sensorstring = "";                                //clear the string
    sensor_string_complete = false;                   //reset the flag used to tell if we have received a completed string from the Atlas Scientific product
   */
 
}

