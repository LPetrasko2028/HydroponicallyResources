# Hydroponics Schedule Controller

This is a Node.js script that controls the power of the water pumps and lighting circuit relays based on a schedule. It is designed to be run as a daemon on a Raspberry Pi.

## Description

There are two types of schedules supported: interval and daily. The interval schedule is used for water pumps, while the daily schedule is used for lighting circuit relays. However you can use whichever schedule you want for each relay.

The interval schedule is defined by an object with the following properties:

- intervalMinutes: The interval in minutes between relay turns.
- durationMinutes: The duration of each relay turn in minutes.

The daily schedule is defined by an object with the following properties:

- events: An array of objects containing the start and stop times for each relay turn.

Each relay turn is defined by an object with the following properties:

- startTime: The start time of the relay turn in 24-hour format (e.g. "09:00").
- stopTime: The stop time of the relay turn in 24-hour format (e.g. "17:00").

This script does not allow for interval and daily schedules to combine for a single relay. Each relay must have a unique schedule, I cannot think of a reason why you would want to do this, so I have not implemented it.

Conflicting schedules should be prevented when implemented in the Hydroponically backend. They are currently resolved by using the last active schedule event in the array ( IntervalWindow for interval schedule, events for daily schedule ).

## Data

parameters are passed to the controller via a config object e.g.

```javascript
const config = {
    relays: [
        { 
            pin: 518, 
            name: 'WaterCircuitRelay', 
            schedule: {
                type: 'interval',
                interval: { intervalMinutes: 30, durationMinutes: 2 }
            }
        },
        {
            pin: 538, 
            name: 'WaterCircuitRelay2',
            schedule: {
                type: 'interval',
                IntervalWindow: [
                    { startTime: '08:00', endTime: '22:00',
                        interval: { intervalMinutes: 15, durationMinutes: 2 }
                    },
                    { startTime: '22:00', endTime: '08:00',
                        interval: { intervalMinutes: 60, durationMinutes: 2 }
                    },
                ]
            }
        },
        { 
            pin: 525, 
            name: 'LightingCircuitRelay',
            schedule: {
                type: 'daily',
                events: [
                    { startTime: '09:00', stopTime: '17:00' }
                ]
            }
         },
        { 
            pin: 531, 
            name: 'LightingCircuitRelay2',
            schedule: {
                type: 'daily',
                events: [
                    { startTime: '09:00', stopTime: '17:00' }
                ]
            }
         },
    ],
    onValue: 0,
    offValue: 1,
    checkInterval: 15000
};
```

The relays array contains objects with the following properties:

- pin: The GPIO pin number of the relay
- name: The name of the relay
- schedule: An object containing the schedule for the relay.
