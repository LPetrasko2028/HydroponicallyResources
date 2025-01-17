export const scheduleControllerConfig = {
    relays: [
        { pin: 518, name: 'EmptyCircuitRelay', 
            schedule: {
                type: 'interval',
                interval: { intervalMinutes: 240, durationMinutes: 2 }
            }
        },
        { pin: 525, name: 'EmptyCircuitRelay',
            schedule: {
                type: 'daily',
                events: [
                    { startTime: '15:00', stopTime: '15:05' }
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
                        interval: { intervalMinutes: 20, durationMinutes: 2 }
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

export const waterControllerConfig = {
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
        { pin: 533, name: 'phUp' },
        { pin: 532, name: 'phDown' },
        { pin: 528, name: 'nutrientA' },
        { pin: 524, name: 'nutrientB' },
        { pin: 537, name: 'nutrientC' },
        
    ] // Relay list as param allows flexibility for different nutrient brands with more than 2 parts

};

export const arduinoControllerConfig = {
    serial: {
        port: '/dev/ttyUSB0',
        baudRate: 9600,
        autoOpen: false,
    }
    // TODO: Add a auto usb finding capability
};