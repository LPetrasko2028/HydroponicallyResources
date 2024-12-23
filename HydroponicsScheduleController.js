import { Gpio } from 'onoff';

/* TODOs:

- Integrate intervalMinutes into function - specifying the interval in minutes allows for more flexibility. Also want to add an intervalWindow to specify the time window for the interval (e.g. 2 minutes every hour, but only between 9:00 AM and 5:00 PM)

*/

// Configuration for relay pins and schedule
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
        { pin: 531, name: 'LightingCircuitRelay2',
            schedule: {
                type: 'daily',
                events: [
                    { startTime: '09:00', stopTime: '17:00' }
                ]
            }
         },
        { pin: 538, name: 'WaterCircuitRelay2',
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
        if (relays[relayIndex].gpio.readSync() === config.offValue) {
            relays[relayIndex].gpio.writeSync(config.onValue);
            // console.log("relay", relay);
            // console.log(`Interval Relay: ${relay.name} turned ON (${interval.intervalMinutes} minute interval) for ${interval.durationMinutes} minutes`);
            console.log(`${new Date().toLocaleTimeString()} - ${relay.name} turned ON (${interval.intervalMinutes} minute interval, for ${interval.durationMinutes} minutes)`);
            // relay.lastRunTime = new Date();
        }
    } else {
        if (relays[relayIndex].gpio.readSync() === config.onValue) {
            relays[relayIndex].gpio.writeSync(config.offValue);
            // console.log("relay", relay);
            console.log(`${new Date().toLocaleTimeString()} - ${relay.name} turned OFF (${interval.intervalMinutes} minute interval)`);
        }
    }
}

// Handle Daily Relay
function handleDailyRelay(relayIndex) {
    const relay = relays[relayIndex];
    const currentMinutes = getCurrentMinutes();

    const shouldBeOn = relay.schedule.events.some(event => currentMinutes >= timeToMinutes(event.startTime) && currentMinutes < timeToMinutes(event.stopTime));
    const currentState = relay.gpio.readSync();
    
    if (shouldBeOn && currentState === config.offValue) {
        relay.gpio.writeSync(config.onValue);
        console.log(`${new Date().toLocaleTimeString()} - ${relay.name} turned ON (daily schedule)`);
        // relay.lastRunTime = new Date();
    } else if (!shouldBeOn && currentState === config.onValue) {
        relay.gpio.writeSync(config.offValue);
        console.log(`${new Date().toLocaleTimeString()} - ${relay.name} turned OFF (daily schedule)`);
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