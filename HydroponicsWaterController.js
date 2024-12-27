import { Gpio } from 'onoff';

import ArduinoController from './ArduinoController.js';

export default class HydroponicsWaterController {
    constructor(config) {
        // Store relays
        this.relays = config.relays.map(relay => ({
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

        // Initialize Arduino Controller
        this.arduinoController = new ArduinoController(config.arduinoController);

        // Initialize all pumps to off
        this.stopAllPumps();
    }

    TDSLoop() {
        // Send request for TDS data
        this.arduinoController.sendRequestForSensorData('TDS');
        wh
    }

    // Read sensor values (implement your specific sensor reading logic here)
    async readSensors() {
        try {
            // Replace these with actual sensor reading implementation
            // This is where you'd interface with your pH and nutrient sensors
            return {
                nutrientLevel: await this.readNutrientSensor(),
                phLevel: await this.readPhSensor()
            };
        } catch (error) {
            console.error('Sensor reading error:', error);
            throw error;
        }
    }

    // Example nutrient sensor reading implementation
    async readNutrientSensor() {
        // Implement your nutrient sensor reading logic here
        // This is just a placeholder
        return new Promise((resolve) => {
            // Replace with actual sensor reading
            resolve(0); // Return actual PPM reading
        });
    }

    // Example pH sensor reading implementation
    async readPhSensor() {
        // Implement your pH sensor reading logic here
        // This is just a placeholder
        return new Promise((resolve) => {
            // Replace with actual sensor reading
            resolve(0); // Return actual pH reading
        });
    }

    // Control functions for pumps
    async adjustNutrients(currentLevel) {
        console.log(`Current nutrient level: ${currentLevel}ppm, Target: ${this.targetLevels.nutrient}ppm`);
        
        if (currentLevel < this.targetLevels.nutrient - this.tolerance.nutrient) {
            console.log('Adding nutrients...');
            
            // Run both nutrient pumps simultaneously
            this.relays.nutrientA.writeSync(0); // ON
            this.relays.nutrientB.writeSync(0); // ON
            
            await new Promise(resolve => setTimeout(resolve, this.timing.nutrient));
            
            this.relays.nutrientA.writeSync(1); // OFF
            this.relays.nutrientB.writeSync(1); // OFF
            
            // Wait for mixing
            await new Promise(resolve => setTimeout(resolve, 5000));
            return true;
        }
        return false;
    }

    async adjustPH(currentPH) {
        console.log(`Current pH: ${currentPH}, Target: ${this.targetLevels.ph}`);
        
        if (Math.abs(currentPH - this.targetLevels.ph) > this.tolerance.ph) {
            if (currentPH > this.targetLevels.ph) {
                console.log('Adding pH down...');
                this.relays.phDown.writeSync(0); // ON
                await new Promise(resolve => setTimeout(resolve, this.timing.ph));
                this.relays.phDown.writeSync(1); // OFF
            } else {
                console.log('Adding pH up...');
                this.relays.phUp.writeSync(0); // ON
                await new Promise(resolve => setTimeout(resolve, this.timing.ph));
                this.relays.phUp.writeSync(1); // OFF
            }
            
            // Wait for mixing
            await new Promise(resolve => setTimeout(resolve, 5000));
            return true;
        }
        return false;
    }

    stopAllPumps() {
        // Set all relays to OFF (1 for active low relays)
        Object.values(this.relays).forEach(relay => relay.writeSync(1));
        console.log('All pumps stopped');
    }

    // Main control loop
    async maintainLevels() {
        try {
            let adjustmentsMade = false;
            const readings = await this.readSensors();
            
            // Check and adjust nutrients
            if (await this.adjustNutrients(readings.nutrientLevel)) {
                adjustmentsMade = true;
            }
            
            // Check and adjust pH
            if (await this.adjustPH(readings.phLevel)) {
                adjustmentsMade = true;
            }
            
            return {
                adjustmentsMade,
                readings
            };
        } catch (error) {
            console.error('Error in control loop:', error);
            this.stopAllPumps();
            throw error;
        }
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
async function main() {
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

    const controller = new HydroponicsWaterController(config);

    // Control loop
    const interval = setInterval(async () => {
        try {
            const result = await controller.maintainLevels();
            
            if (!result.adjustmentsMade) {
                console.log('Levels within target range:', result.readings);
            }
        } catch (error) {
            console.error('Control loop error:', error);
            clearInterval(interval);
            controller.cleanup();
        }
    }, mixingTime + 5000);

    // Cleanup on exit
    process.on('SIGINT', () => {
        clearInterval(interval);
        controller.cleanup();
        process.exit();
    });
}

// Start the system
main().catch(error => {
    console.error('System error:', error);
    process.exit(1);
});