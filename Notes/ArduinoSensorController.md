# Arduino Sensor Controller

Arduino code to control the sensors on the Hydroponically project.

## Overview

Arduino nano or uno connected to the raspberry pi via USB. The code is written in C++ and uses the Arduino IDE.

- Data is sent to the raspberry pi via serial port. Serial port is set to 9600 baud (Serial.begin(9600);)
- Continuous / Analog data is collected from each sensor
- Data is processed and converted to digital data (smoothed, filtered, etc.)
- Program needs to check for variables that can be set by the raspberry pi (Main Daemon)
- Raspberry pi sends data to the Arduino via serial port
- Data from raspberry pi {
    - ReadSensor (bool) or (int - 0/1)
    - TargetSensor
    
    }