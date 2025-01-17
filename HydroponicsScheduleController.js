import { Gpio } from 'onoff';

import { waterController } from './HydroponicallyResourcesMain.js';


export default class HydroponicsScheduleController {
    constructor(config) {
        // Store relays
        this.onValue = config.onValue;
        this.offValue = config.offValue;
        this.checkInterval = config.checkInterval;
        this.relays = config.relays.map(relay => ({
            gpio: new Gpio(relay.pin, 'out'),
            name: relay.name,
            schedule: relay.schedule,
            lastRunTime: null
        }));
        this.relays.forEach(relay => {
            relay.gpio.writeSync(this.config.offValue);
            console.log(`Initialized ${relay.name} to OFF state`);
        });
        this.waterPumpOn = false;
    }
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    getCurrentMinutes() {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }
    handleIntervalRelay(relayIndex) {
        const relay = this.relays[relayIndex];
    
        const currentMinutes = getCurrentMinutes();
    
        let interval;
    
        if ( relay.schedule.hasOwnProperty('IntervalWindow') ) {         // Check if IntervalWindow is defined
            const notInIntervalWindow = relay.schedule.IntervalWindow.every(intervalWindow => {
                const bool = (currentMinutes < timeToMinutes(intervalWindow.startTime) || currentMinutes > timeToMinutes(intervalWindow.endTime));
                if (!bool) { interval = intervalWindow.interval; }
                return bool;
            });
            if (notInIntervalWindow) { return; }                         // If not in interval window, return
        } else {
            interval = relay.schedule.interval;
        }
    
        // Turn on for the first x minutes of every interval for the interval window length
        if ((currentMinutes % interval.intervalMinutes) <= (interval.durationMinutes)){
            if (this.relays[relayIndex].gpio.readSync() === this.config.offValue) {
                // -------- Turn on the relay --------
                this.relays[relayIndex].gpio.writeSync(this.config.onValue);
                console.log(`${new Date().toLocaleTimeString()} - ${relay.name} turned ON (${interval.intervalMinutes} minute interval, for ${interval.durationMinutes} minutes)`); 
                // -------- If water pump --------
                if (relay.name === 'WaterPump') {
                    // -------- Start the water controller --------
                    waterController.maintainLevels();
                }
                // relay.lastRunTime = new Date();
            }
        } else {
            if (this.relays[relayIndex].gpio.readSync() === this.config.onValue) {
                this.relays[relayIndex].gpio.writeSync(this.config.offValue);
                // console.log("relay", relay);
                console.log(`${new Date().toLocaleTimeString()} - ${relay.name} turned OFF (${interval.intervalMinutes} minute interval)`);
            }
        }
    }
    handleDailyRelay(relayIndex) {
        const relay = this.relays[relayIndex];
        const currentMinutes = getCurrentMinutes();
    
        const shouldBeOn = relay.schedule.events.some(event => currentMinutes >= timeToMinutes(event.startTime) && currentMinutes < timeToMinutes(event.stopTime));
        const currentState = relay.gpio.readSync();
        
        if (shouldBeOn && currentState === this.config.offValue) {
            relay.gpio.writeSync(config.onValue); // Turn on the relay
            console.log(`${new Date().toLocaleTimeString()} - ${relay.name} turned ON (daily schedule)`);
            // -------- If water pump --------
            if (relay.name === 'WaterPump') {
                // -------- Start the water controller --------
                waterController.maintainLevels();
            }
            // relay.lastRunTime = new Date();
        } else if (!shouldBeOn && currentState === config.onValue) {
            relay.gpio.writeSync(config.offValue);
            console.log(`${new Date().toLocaleTimeString()} - ${relay.name} turned OFF (daily schedule)`);
        }
    }
    checkSchedule() {
        this.relays.forEach((relay, relayIndex) => {
            if (relay.schedule) {
                if (relay.schedule.type === 'interval') {
                    handleIntervalRelay(relayIndex);
                } else if (relay.schedule.type === 'daily') {
                    handleDailyRelay(relayIndex);
                }
            }
        });
    }
    start() {
        // Run the scheduler
        console.log('Relay scheduler started. Press Ctrl+C to exit.');
    
        // Check every 30 seconds to ensure we don't miss state changes
        IntervalIDs.schedulerInterval = setInterval(checkSchedule, this.config.checkInterval);
    
        // Cleanup on exit
        process.on('SIGINT', () => {
            clearInterval(IntervalIDs.schedulerInterval);
            this.relays.forEach(relay => {
                relay.gpio.writeSync(this.config.offValue); // Turn off all relays
                relay.gpio.unexport(); // Free resources
            });
            console.log('\nRelay scheduler stopped. All relays turned off.');
            process.exit();
        });
    }
}

// Example Configuration for relay pins and schedule
/*
const config = {
    relays: [
        { pin: 518, name: 'WaterCircuitRelay', 
            schedule: {
                type: 'interval',
                interval: { intervalMinutes: 30, durationMinutes: 2 }
            }
        },
        { pin: 525, name: 'LightingCircuitRelay',
            schedule: {
                type: 'daily',
                events: [
                    { startTime: '09:00', stopTime: '17:00' }
                ]
            }
         },
        { pin: 531, name: 'Lights',
            schedule: {
                type: 'daily',
                events: [
                    { startTime: '09:00', stopTime: '17:00' }
                ]
            }
         },
        { pin: 538, name: 'WaterPump',
            schedule: {
                type: 'interval',
                IntervalWindow: [
                    {
                        startTime: '00:00', endTime: '08:00',
                        interval: { intervalMinutes: 60, durationMinutes: 2 }
                    },
                    { startTime: '08:00', endTime: '22:00',
                        interval: { intervalMinutes: 15, durationMinutes: 2 }
                    },
                    { startTime: '20:00', endTime: '24:00',
                        interval: { intervalMinutes: 60, durationMinutes: 2 }
                    },
                ]
            }
         }  
    ],
    onValue: 0,
    offValue: 1,
    checkInterval: 15000
};
*/
