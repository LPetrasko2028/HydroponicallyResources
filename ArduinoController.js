import SerialPort from 'serialport';

export default class ArduinoController {

    constructor(config) {
        this.port = new SerialPort('/dev/ttyUSB0', {
            baudRate: 9600,
            autoOpen: false,
        });
        this.port.open((err) => {
            if (err) {
                return console.error('Error opening port:', err.message);
            }
            console.log('Serial port opened');
        });
        
        this.port.on('data', (data) => {
          console.log('Received data: ', data.toString());
        });
        
        this.port.on('error', (err) => {
          console.log('Error: ', err.message);
        });
        
    }

    // Send a request for sensor data to the Arduino
    async sendData(data) {
        try {
            await port.write(data);
        } catch (error) {
            console.error('Error sending data:', error);
            throw error;
        }
    }
}
// TODO: Add a auto usb finding capability




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