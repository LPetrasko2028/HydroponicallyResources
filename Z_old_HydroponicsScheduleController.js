const { Gpio } = require('onoff');

// Configuration for relay pins and schedule
const config = {
    relays: [
        { pin: 518, name: 'WaterCircuitRelay' },
        { pin: 525, name: 'LightingCircuitRelay' },
        { pin: 27, name: 'Relay 3' }
    ],
    schedule: [
        { time: '06:00', state: 1, relayIndex: 0 },  // Turn on Relay 1 at 6 AM
        { time: '09:00', state: 0, relayIndex: 0 },  // Turn off Relay 1 at 9 AM
        { time: '18:00', state: 1, relayIndex: 1 },  // Turn on Relay 2 at 6 PM
        { time: '22:00', state: 0, relayIndex: 1 }   // Turn off Relay 2 at 10 PM
    ]
};

// Initialize GPIO pins for relays
const relays = config.relays.map(relay => ({
    gpio: new Gpio(relay.pin, 'out'),
    name: relay.name
}));

// Convert time string to minutes since midnight for easier comparison
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Get current time in minutes since midnight
function getCurrentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

// Check and execute scheduled tasks
function checkSchedule() {
    const currentMinutes = getCurrentMinutes();
    
    config.schedule.forEach(task => {
        const taskMinutes = timeToMinutes(task.time);
        
        // Check if it's time to execute this task (within the last minute)
        if (currentMinutes === taskMinutes) {
            const relay = relays[task.relayIndex];
            relay.gpio.writeSync(task.state);
            console.log(`${new Date().toLocaleTimeString()} - ${relay.name} turned ${task.state ? 'on' : 'off'}`);
        }
    });
}

// Initialize all relays to off state
relays.forEach(relay => {
    relay.gpio.writeSync(0);
    console.log(`Initialized ${relay.name} to OFF state`);
});

// Run the scheduler
console.log('Relay scheduler started. Press Ctrl+C to exit.');
const schedulerInterval = setInterval(checkSchedule, 60000); // Check every minute

// Cleanup on exit
process.on('SIGINT', () => {
    clearInterval(schedulerInterval);
    relays.forEach(relay => {
        relay.gpio.writeSync(0); // Turn off all relays
        relay.gpio.unexport(); // Free resources
    });
    console.log('\nRelay scheduler stopped. All relays turned off.');
    process.exit();
});