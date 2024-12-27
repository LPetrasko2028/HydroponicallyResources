// Global variables for storing received data
const int BUFFER_SIZE = 64;
char inputBuffer[BUFFER_SIZE];
int bufferIndex = 0;

int TDSInputPin = A0;
int pHInputPin = A2;
int tempInputPin = A4;

void setup() {
  // Initialize serial communication at 9600 baud rate
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect
  }
}

void loop() {
  // Logic: read data from raspberry pi, call function that gathers sensor data, and send it to the raspberry pi

  // Check if data is available to read
  while (Serial.available() > 0) {
    // Read the incoming byte
    char incomingByte = Serial.read();
    
    // Store character in buffer if not newline
    if (incomingByte != '\n' && bufferIndex < BUFFER_SIZE - 1) {
      inputBuffer[bufferIndex] = incomingByte;
      bufferIndex++;
    }
    // Process the complete message when newline is received
    else {
      inputBuffer[bufferIndex] = '\0';  // Null terminate the string
      processReceivedData();
      bufferIndex = 0;  // Reset buffer index
    }
  }
}

void processReceivedData() {
  // Example processing function
  // Here you can add your own logic to process the received data
  
  // Echo back the received data with a prefix
  Serial.print("Arduino received: ");
  Serial.println(inputBuffer);
  
  // You can add more complex processing here
  // For example, parse commands and respond accordingly
  if (strcmp(inputBuffer, "pH") == 0) {
    genLoop(pHInputPin);
  }
  else if (strcmp(inputBuffer, "TDS") == 0) {
    genLoop(TDSInputPin);
  }
  else if (strcmp(inputBuffer, "temp") == 0) {
    genLoop(tempInputPin);
  }
}

void GenLoop(int sensorPin) {
  while (Serial.available() == 0) {
    int sensorValue = getAndSmoothSensorData(sensorPin);

    // Send sensor data to the Raspberry Pi
    Serial.print("Sensor reading: ");
    Serial.println(sensorValue);
    delay(500);

  }

}

int getAndSmoothSensorData(int sensorPin) {
  // read the sensor multiple times and return the average value for increased accuracy
  int numReadings = 10;
  int total = 0;
  for(int i = 0; i < numReadings; ++i) {
    total += analogRead(sensorPin);
    delay(100);
  }
  return total / numReadings;
}