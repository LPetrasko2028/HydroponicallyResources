import HydroponicsWaterController from './HydroponicsWaterController.js';
import HydroponicsScheduleController from './HydroponicsScheduleController.js';
import ArduinoController from './ArduinoController.js';

import { waterControllerConfig, scheduleControllerConfig, arduinoControllerConfig } from './configs.js';

const IntervalIDs = {
    schedulerInterval: 0
};

const scheduleController = new HydroponicsScheduleController(scheduleControllerConfig);
export const waterController = new HydroponicsWaterController(waterControllerConfig);
export const arduinoController = new ArduinoController(arduinoControllerConfig);

export function startScheduler() {
    // Set the interval to check the schedule
    IntervalIDs.schedulerInterval = setInterval(scheduleController.checkSchedule, scheduleControllerConfig.checkInterval);
}
export function stopScheduler() {
    clearInterval(IntervalIDs.schedulerInterval);
}


async function main() {

    // Set the interval to check the schedule
    IntervalIDs.schedulerInterval = setInterval(scheduleController.checkSchedule, scheduleControllerConfig.checkInterval);
    // Cleanup on exit
    process.on('SIGINT', () => {
        clearInterval(IntervalIDs.schedulerInterval);
        scheduleController.cleanup();
        waterController.cleanup();
        process.exit();
    });
}

// Start the system
main().catch(error => {
    console.error('System error:', error);
    process.exit(1);
});