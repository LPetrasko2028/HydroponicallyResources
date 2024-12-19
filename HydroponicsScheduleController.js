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
                intervalMinutes: 60,
                durationMinutes: 2
            }
        }, // 2 minutes every hour
        { pin: 525, name: 'LightingCircuitRelay',
            schedule: {
                type: 'daily',
                onTime: '00:00',
                offTime: '23:00'
            }
         },  // 9 AM to 5 PM
        { pin: 531, name: 'LightingCircuitRelay2',
            schedule: {
                type: 'daily',
                onTime: '00:00',
                offTime: '23:00'
            }
         }, // 2 minutes every hour
        { pin: 538, name: 'WaterCircuitRelay2',
            schedule: {
                type: 'interval',
                intervalMinutes: 60,
                durationMinutes: 2
            }
         }  // 9 AM to 5 PM
    ],
    onValue: 0,
    offValue: 1
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
    const now = new Date();
    const currentMinute = now.getMinutes();
    
    // Turn on for the first x minutes of every interval for the interval window length
    if (currentMinute < relays[relayIndex].schedule.durationMinutes) {
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
    const onMinutes = timeToMinutes(relays[relayIndex].schedule.onTime);
    const offMinutes = timeToMinutes(relays[relayIndex].schedule.offTime);
    
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
console.log(`Relay 1 will turn ON for 2 minutes at the start of every hour`);
console.log(`Relay 2 will turn ON at 9:00 AM and OFF at 5:00 PM daily`);
console.log(`Relay 3 will turn ON at 9:00 AM and OFF at 5:00 PM daily`);
console.log(`Relay 4 will turn ON for 2 minutes at the start of every hour`);


// Check every 30 seconds to ensure we don't miss state changes
const schedulerInterval = setInterval(checkSchedule, 30000);

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