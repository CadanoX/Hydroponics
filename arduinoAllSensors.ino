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

// EC and PH are on Hardware Serials 2 and 3
#define BAUDRATE_PH_SENSOR 9600 // Serial3
#define BAUDRATE_EC_SENSOR 9600 // Serial2
#define DHTRx 8
#define tempWaterRx 9
#define relay1Pin 2
#define relay2Pin 3
#define pump1Pin1 4 // pump pH increase
#define pump1Pin2 5 // pump pH increase
#define pump2Pin1 6 // pump pH decrease
#define pump2Pin2 7 // pump pH decrease

int freeRam () {
  extern int __heap_start, *__brkval; 
  int v; 
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval); 
}

float humidity = 450;
float tempAir;
float tempWater;

int timeLast = 0;
int timeCur = 0;
int timeDiff = 0;
int dhtLast = 0;
int dhtDelay = 1000;

bool newMeasurements = false;

static char serial1ReadBuffer[80];
static char serial2ReadBuffer[80];
static char serial3ReadBuffer[80];
int serialReadPos = 0;

int readline(int readch, char *buffer, int len, int& pos)
{
	int rpos;

	if (readch > 0)
	{
		switch (readch)
		{
			case '\n': // Ignore new-lines
				break;
			case '\r': // Return on CR
				rpos = pos;
				pos = 0;  // Reset position index ready for next time
				return rpos;
			default:
				if (pos < len-1) {
					buffer[pos++] = readch;
					buffer[pos] = 0;
				}
		}
	}
	// No end of line has been found, so return -1.
	return -1;
}

struct PhSensor
{
	PhSensor()
	{
	}
	
	void read()
	{
		if (readline(Serial3.read(), serial3ReadBuffer, 80, this->readPos) > 0)
		{
			if (isdigit(*serial3ReadBuffer))
			{
				this->PH = atof(serial3ReadBuffer);
				this->newMeasurements = true;
			}
			else
				Serial.println(serial3ReadBuffer);
		}
	}

	float getValue()
	{
		this->newMeasurements = false;
		return this->PH;
	}
	
	void setValue(float value)
	{
		this->PH = value;
		this->newMeasurements = true;
	}
	
	void write(const char* input)
	{
		//Serial.print("input: ");
		//Serial.print(input);
		Serial3.print(input);                      //send that string to the Atlas Scientific product
		Serial3.print('\r');                             //add a <CR> to the end of the string
	}

	bool newMeasurements = false;
	float PH = -1;
	int readPos = 0;
} phSensor;

struct EcSensor
{
	EcSensor()
	{
	}
	
	void read()
	{
		if (readline(Serial2.read(), serial2ReadBuffer, 80, this->readPos) > 0)
		{
			if (isdigit(*serial2ReadBuffer))
			{
				char* sEC = strtok(serial2ReadBuffer, ",");               //let's pars the array at each comma
				char* sTDS = strtok(NULL, ",");                            //let's pars the array at each comma
				char* sSAL = strtok(NULL, ",");                            //let's pars the array at each comma
				char* sGRAV = strtok(NULL, ",");                           //let's pars the array at each comma

				this->EC = atof(sEC);
				this->TDS = atof(sTDS);
				this->SAL = atof(sSAL);
				this->GRAV = atof(sGRAV);
				this->newMeasurements = true;
			}
			else
				Serial.println(serial3ReadBuffer);
		}
	}

	float getValue()
	{
		this->newMeasurements = false;
		return this->EC;
	}
	
	void setValue(float value)
	{
		this->EC = value;
		this->newMeasurements = true;
	}
	
	void write(const char* input)
	{
		//Serial.print("input: ");
		//Serial.print(input);
		Serial2.print(input);                      //send that string to the Atlas Scientific product
		Serial2.print('\r');                             //add a <CR> to the end of the string
	}

	bool newMeasurements = false;
	float EC = 0;
	float TDS = 0; 
	float SAL = 0; 
	float GRAV = 0;
	int readPos = 0;
} ecSensor;

//class describing a pump
class Pump                                           
{
public:
	//constructor sets pin, on which the pump is located
	Pump(int pin, int pin2 = -1) : pin(pin), pin2(pin2)
	{
		pinMode(pin, OUTPUT);                    //set pump pins as output to be able to write to it
		digitalWrite(pin, LOW);
		if (pin2 != -1)
		{
			pinMode(pin2, OUTPUT);
			digitalWrite(pin2, LOW);
		}
	}

	int check()
	{
		//Serial.print("Pump state: ");
		//Serial.println(state);

		if (state == 0 || state == 3) //pump is idling or forced to stay on
			return 0;

		//Serial.print("Pump timer: ");
		//Serial.println(timer);
		  
		if (timer > 0)
			timer -= timeDiff;
		else
		{
			if (state == 1)
				stop();
			else
				state = 0; // reset the pump to idle state
		}

		return timer;
	}

	//let the pump run for "runtime" milliseconds and then stop
	void start(int runtime = -1)                              
	{
		if (state != 0)                      //dont start pump when it is already running or in pause state
		{
			//Serial.println("Pump is already running or on pause.");
			return;
		}

		//Serial.println("EC.Low.PumpOn.");
		digitalWrite(pin, HIGH);
		if (runtime == -1)
			state = 3;
		else
		{
			state = 1;
			timer = runtime;
		}
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
	int state = 0;                                      // 0 = idle, 1 = running, 2 = pausing, 3 = running until manually stopped
	int timer = 0;  
	int pin;
	int pin2;
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

void setup()
{
	Serial.begin(9600);
	Serial2.begin(BAUDRATE_EC_SENSOR);
	Serial3.begin(BAUDRATE_PH_SENSOR);
	
	dht.begin();
	humidity = dht.readHumidity();
	tempAir = dht.readTemperature();

	// start with sockets turned off
	pinMode(relay1Pin, OUTPUT);
	pinMode(relay2Pin, OUTPUT);
	digitalWrite(relay1Pin, HIGH);
	digitalWrite(relay2Pin, HIGH);
}

void loop()     	                                  //here we go...
{
	timeLast = timeCur;
	timeCur = millis();
	timeDiff = timeCur - timeLast;

	// read Client inputs
	if (readline(Serial.read(), serial1ReadBuffer, 80, serialReadPos) > 0)
	{
		char* receiver = strtok(serial1ReadBuffer, " ");               //let's pars the array at each comma
		char* command = strtok(NULL, " ");
		executeCommand(atoi(receiver), command);
	}
	
	ecSensor.read();
	phSensor.read();

	pumpPhIncr.check();
	pumpPhDecr.check();

	checkDht();
	tempWaterSensor.check();
	
	/*
	Serial.print(newMeasurements);
	Serial.print(" - ");
	Serial.print(phSensor.newMeasurements);
	Serial.print(" - ");
	Serial.println(ecSensor.newMeasurements);
	*/
	
	// only print message when all sensor were read
	if (newMeasurements
		&& phSensor.newMeasurements
		&& ecSensor.newMeasurements)
	{
		// send measurements to raspberry in JSON format
		char floatHelp[10];

		Serial.print('{');

		if (!isnan(tempWaterSensor.temperature))
		{
			Serial.print("\"WaterTemp\": ");
			dtostrf(tempWaterSensor.temperature, 8, 3, floatHelp);
			Serial.print(floatHelp);
			Serial.print(",");
		}

		if (!isnan(humidity))
		{
			Serial.print("\"Humidity\": ");
			dtostrf(humidity, 8, 3, floatHelp);
			Serial.print(floatHelp);
			Serial.print(",");
		}

		if (!isnan(tempAir))
		{
			Serial.print("\"Temp\": ");
			dtostrf(tempAir, 8, 3, floatHelp);
			Serial.print(floatHelp);
			Serial.print(",");
		}

		if(phSensor.newMeasurements)
		{
			Serial.print("\"PH\": ");
			dtostrf(phSensor.getValue(), 8, 3, floatHelp);
			Serial.print(floatHelp);
			Serial.print(",");
		}

		if(ecSensor.newMeasurements)
		{
			Serial.print("\"EC\": ");
			dtostrf(ecSensor.getValue(), 8, 3, floatHelp);
			Serial.print(floatHelp);
			Serial.print(",");
			
			Serial.print("\"TDS\": ");
			dtostrf(ecSensor.TDS, 8, 3, floatHelp);
			Serial.print(floatHelp);
			Serial.print(",");

			Serial.print("\"SAL\": ");
			dtostrf(ecSensor.SAL, 8, 3, floatHelp);
			Serial.print(floatHelp);
			Serial.print(",");

			Serial.print("\"GRAV\": ");
			dtostrf(ecSensor.GRAV, 8, 3, floatHelp);
			Serial.print(floatHelp);
		}

		Serial.println('}');

		Serial.flush(); // wait until the string was sent
		newMeasurements = false;
	}
}