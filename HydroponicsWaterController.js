import { Gpio } from 'onoff';

// import { sendSensorDataToDatabase } from '';

import { startScheduler, stopScheduler, arduinoController } from './HydroponicallyResourcesMain.js';

export default class HydroponicsWaterController {
    constructor(config) {
        // Store relays
        this.phRelays = config.relays.filter(relay => relay.name === 'phUp' || relay.name === 'phDown').map(relay => ({
            gpio: new Gpio(relay.pin, 'out', { activeLow: true }),
            name: relay.name
        }));
        this.nutrientRelays = config.relays.filter(relay => relay.name.includes('nutrient')).map(relay => ({
            gpio: new Gpio(relay.pin, 'out', { activeLow: true }),
            name: relay.name
        }));

        // Store target levels
        this.targetLevels = {
            nutrient: config.targets.nutrientLevel, // Target PPM
            ph: config.targets.phLevel              // Target pH
        };

        // Store tolerances
        this.tolerance = {
            nutrient: config.tolerance.nutrient,  // PPM tolerance
            ph: config.tolerance.ph               // pH tolerance
        };

        // Store timings (in milliseconds)
        this.timing = {
            nutrient: config.timing.nutrientDeliveryInterval,    // nutrient pump runtime duration
            ph: config.timing.phAdjustmentInterval,              // pH adjustment runtime duration
            mixingTime: config.timing.mixingTime                 // mixing time duration
        };

        // Relay on/off values
        this.onValue = config.onValue;
        this.offValue = config.offValue;

        // Initialize all pumps to off
        this.stopAllPumps();

        this.timeout = false;
    }

    async TDSLoop() {
        this.startTimeout();
        // Send request for TDS data
        arduinoController.sendRequestForSensorData('TDS');
        // wait for the data to come in
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        while (!this.timeout && arduinoController.values[arduinoController.values.length - 1].value < this.targetLevels.nutrient - this.tolerance.nutrient) {
            // turn on the nutrient pumps for increments of x for appropriate ratios of nutrient parts
            this.nutrientRelays.forEach(relay => relay.writeSync(this.onValue));
            await new Promise(resolve => setTimeout(resolve, this.timing.nutrient));
            this.nutrientRelays.forEach(relay => relay.writeSync(this.onValue));
            await new Promise(resolve => setTimeout(resolve, this.timing.mixingTime));
        }
        // stop the sensor data stream
        arduinoController.endDataStream();

        // Save the data
        // send arduinoController.values to the database
        console.log(arduinoController.values);
        // await sendSensorDataToDatabase('TDS', arduinoController.values);
        // dataType is a string that is TDS, pH, or temp
        
        // clear the values
        arduinoController.clearValues();
    }

    async pHLoop() {
        this.startTimeout();
        // Send request for pH data
        arduinoController.sendRequestForSensorData('pH');
        // wait for the data to come in
        await new Promise(resolve => setTimeout(resolve, 2000));

        while (!this.timeout && arduinoController.values[arduinoController.values.length - 1].value < this.targetLevels.ph - this.tolerance.ph || arduinoController.values[arduinoController.values.length - 1].value > this.targetLevels.ph + this.tolerance.ph) {
            if (arduinoController.values[arduinoController.values.length - 1].value < this.targetLevels.ph - this.tolerance.ph) {
                this.phRelays.filter(relay => relay.name === 'phUp').forEach(relay => relay.writeSync(this.onValue));
                await new Promise(resolve => setTimeout(resolve, this.timing.ph));
                this.phRelays.filter(relay => relay.name === 'phUp').forEach(relay => relay.writeSync(this.offValue));
                await new Promise(resolve => setTimeout(resolve, this.timing.mixingTime));
            } else {
                this.phRelays.filter(relay => relay.name === 'phDown').forEach(relay => relay.writeSync(this.onValue));
                await new Promise(resolve => setTimeout(resolve, this.timing.ph));
                this.phRelays.filter(relay => relay.name === 'phDown').forEach(relay => relay.writeSync(this.offValue));
                await new Promise(resolve => setTimeout(resolve, this.timing.mixingTime));
            }
        }
        // stop the sensor data stream
        arduinoController.endDataStream();
        // Save the data
        // send arduinoController.values to the database
        console.log(arduinoController.values);
        // await sendSensorDataToDatabase('pH', arduinoController.values);

        // clear the values
        arduinoController.clearValues();
    }

    async getTemperature() {
        arduinoController.sendRequestForSensorData('temp');
        // wait for the data to come in
        await new Promise(resolve => setTimeout(resolve, 2000));
        // stop the sensor data stream
        arduinoController.endDataStream();
        // Save the data
        // send arduinoController.values to the database
        console.log(arduinoController.values);
        // await sendSensorDataToDatabase('temp', arduinoController.values);

        // clear the values
        arduinoController.clearValues();
    }

    stopAllPumps() {
        // Set all relays to OFF
        Object.values(this.relays).forEach(relay => relay.writeSync(this.offValue));
        console.log('All pumps stopped');
    }

    // Main control loop
    async maintainLevels() {
        console.log('Starting water controller');
        // -------- Stop the scheduler -------- ( to prevent interference with the water controller )
        /*
            The water pump must be on while nutrient and pH levels are being adjusted and recorded
            to insure mixing occurs correctly.
        */
        stopScheduler();

        // -------- Adjust and Record the Nutrient Levels --------
        this.TDSLoop();
        // -------- Adjust and Record the pH Levels --------
        this.pHLoop();
        // -------- Record the Temperature --------
        this.getTemperature();

        // -------- Restart the scheduler --------
        startScheduler();

        console.log('Water controller stopped');
    }

    startTimeout() {
        this.timeout = false;
        setTimeout(() => {
            this.timeout = true;
        }, 15000);
    }

    // Cleanup
    cleanup() {
        this.stopAllPumps();
        Object.values(this.relays).forEach(relay => relay.unexport());
        this.arduinoController.cleanup();
        console.log('System cleaned up');
    }
}

// Example usage

/*
    const config = {
        pins: {
            nutrientA: 17,    // GPIO pin for Nutrient A pump
            nutrientB: 18,    // GPIO pin for Nutrient B pump
            phUp: 27,         // GPIO pin for pH Up pump
            phDown: 22        // GPIO pin for pH Down pump
        },
        targets: {
            nutrientLevel: 800,  // Target PPM
            phLevel: 6.0         // Target pH
        },
        tolerance: {
            nutrient: 50,  // PPM tolerance
            ph: 0.2       // pH tolerance
        },
        timing: {
            nutrientDeliveryInterval: 1000,    // 1 second nutrient pump duration
            phAdjustmentInterval: 500,         // 0.5 second pH adjustment duration
            mixingTime: 15000                   // 15 second mixing time
        },
        relays: [
            { pin: 518, name: 'nutrientA' },
            { pin: 525, name: 'nutrientB' },
            { pin: 27, name: 'phUp' },
            { pin: 22, name: 'phDown' },
        ] // Relay list as param allows flexibility for different nutrient brands with more than 2 parts

    };
*/