import SerialPort from 'serialport';

const exampleConfig = {
    serial: {
        port: '/dev/ttyUSB0',
        baudRate: 9600,
        autoOpen: false,
    }
    // TODO: Add a auto usb finding capability
};
export default class ArduinoController {

    constructor(config) {
        this.port = new SerialPort(config.serial.port, {
            baudRate: config.serial.baudRate,
            autoOpen: config.serial.autoOpen,
        });
        this.port.open((err) => {
            if (err) {
                return console.error('Error opening port:', err.message);
            }
            console.log('Serial port opened');
        });
        
        this.port.on('data', (value) => {
          console.log('Received Serial Port data: ', value.toString());
            this.values.push({ value, time: new Date() });
        });
        
        this.port.on('error', (err) => {
          console.log('Serial Port Error: ', err.message);
        });

        this.values = [];
        
    }

    // Send a request for sensor data to the Arduino
    // Data is a string and can be {pH, TDS, temp}
    async sendRequestForSensorData(data) {
        try {
            await port.write(data+'\n');
        } catch (error) {
            console.error('Error sending data:', error);
            throw error;
        }
    }

    async endDataStream() {
        try {
            await port.write('end\n');
        } catch (error) {
            console.error('Error sending end data:', error);
            throw error;
        }
    }

    clearValues() {
        this.values = [];
    }

    cleanup() {
        this.endDataStream();
        this.clearValues();
    }
}

// Clean up on exit
process.on('SIGINT', () => {
    port.close((err) => {
        if (err) {
            console.error('Error closing port:', err.message);
        }
        console.log('Serial port closed');
        process.exit();
    });
});