import { Gpio } from 'onoff';

/* TODOs:

- Integrate intervalMinutes into function - specifying the interval in minutes allows for more flexibility. Also want to add an intervalWindow to specify the time window for the interval (e.g. 2 minutes every hour, but only between 9:00 AM and 5:00 PM)
- Test an interupt style over polling, pre-calculate timing for each day or given time period
    - Pros: Hypothesis- more accurate timing (not subject to polling interval), less cpu usage and better power consumption
    - Cons: Hypothesis- More complex code, more memory usage

*/

// Configuration for relay pins and schedule
const config = {
    relays: [
        { pin: 518, name: 'WaterCircuitRelay', 
            schedule: {
                type: 'interval',
                intervalMinutes: 30,
                durationMinutes: 2
            }
        },
        { pin: 525, name: 'LightingCircuitRelay',
            schedule: {
                type: 'daily',
                startTime: '00:00',
                stopTime: '24:00'
            }
         },
        { pin: 531, name: 'LightingCircuitRelay2',
            schedule: {
                type: 'daily',
                startTime: '00:00',
                stopTime: '24:00'
            }
         },
        { pin: 538, name: 'WaterCircuitRelay2',
            schedule: {
                type: 'interval',
                intervalMinutes: 15,
                durationMinutes: 2,
                IntervalWindow: [
                    { startTime: '00:00', endTime: '22:00' },
                    { startTime: '23:01', endTime: '24:00' }
                ]
            }
         }  
    ],
    onValue: 0,
    offValue: 1,
    checkInterval: 15000
};

// Initialize GPIO pins for relays
const relays = config.relays.map(relay => ({
    gpio: new Gpio(relay.pin, 'out'),
    name: relay.name,
    schedule: relay.schedule,
    lastRunTime: null
}));

// Convert time string to minutes since midnight
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Get current time in minutes since midnight
function getCurrentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

// Handle Interval Relay
function handleIntervalRelay(relayIndex) {
    const relay = relays[relayIndex];

    const currentMinutes = getCurrentMinutes();

    if ( relay.schedule.hasOwnProperty('IntervalWindow') ) {         // Check if IntervalWindow is defined
        const notInIntervalWindow = relay.schedule.IntervalWindow.every(intervalWindow => {
            return currentMinutes < timeToMinutes(intervalWindow.startTime) || currentMinutes > timeToMinutes(intervalWindow.endTime);
        });
        if (notInIntervalWindow) { return; }                         // If not in interval window, return
    }

    // Turn on for the first x minutes of every interval for the interval window length
    if ((currentMinutes % relays[relayIndex].schedule.intervalMinutes) <= (relays[relayIndex].schedule.durationMinutes)){
        if (relays[relayIndex].gpio.readSync() === config.offValue) {
            relays[relayIndex].gpio.writeSync(config.onValue);
            console.log(`${now.toLocaleTimeString()} - ${relays[relayIndex].name} turned ON (hourly interval)`);
        }
    } else {
        if (relays[relayIndex].gpio.readSync() === config.onValue) {
            relays[relayIndex].gpio.writeSync(config.offValue);
            console.log(`${now.toLocaleTimeString()} - ${relays[relayIndex].name} turned OFF (hourly interval)`);
        }
    }
}

// Handle Daily Relay
function handleDailyRelay(relayIndex) {
    const currentMinutes = getCurrentMinutes();
    const onMinutes = timeToMinutes(relays[relayIndex].schedule.startTime);
    const offMinutes = timeToMinutes(relays[relayIndex].schedule.stopTime);
    
    const shouldBeOn = currentMinutes >= onMinutes && currentMinutes < offMinutes;
    const currentState = relays[relayIndex].gpio.readSync();
    
    if (shouldBeOn && currentState === config.offValue) {
        relays[relayIndex].gpio.writeSync(config.onValue);
        console.log(`${new Date().toLocaleTimeString()} - ${relays[relayIndex].name} turned ON (daily schedule)`);
    } else if (!shouldBeOn && currentState === config.onValue) {
        relays[relayIndex].gpio.writeSync(config.offValue);
        console.log(`${new Date().toLocaleTimeString()} - ${relays[relayIndex].name} turned OFF (daily schedule)`);
    }
}

// Check and execute scheduled tasks
function checkSchedule() {
    relays.forEach((relay, relayIndex) => {
        if (relay.schedule) {
            if (relay.schedule.type === 'interval') {
                handleIntervalRelay(relayIndex);
            } else if (relay.schedule.type === 'daily') {
                handleDailyRelay(relayIndex);
            }
        }
    });
}

// Initialize all relays to off state
relays.forEach(relay => {
    relay.gpio.writeSync(config.offValue);
    console.log(`Initialized ${relay.name} to OFF state`);
});

// Run the scheduler
console.log('Relay scheduler started. Press Ctrl+C to exit.');

// Check every 30 seconds to ensure we don't miss state changes
const schedulerInterval = setInterval(checkSchedule, config.checkInterval);

// Run immediately on start
checkSchedule();

// Cleanup on exit
process.on('SIGINT', () => {
    clearInterval(schedulerInterval);
    relays.forEach(relay => {
        relay.gpio.writeSync(config.offValue); // Turn off all relays
        relay.gpio.unexport(); // Free resources
    });
    console.log('\nRelay scheduler stopped. All relays turned off.');
    process.exit();
});