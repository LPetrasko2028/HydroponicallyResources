// First install required packages:
// npm install serialport usb

import { SerialPort } from 'serialport';
import usb from 'usb';

const arduinoProductIds = [
    '0043', // Arduino Uno
    '0044', // Arduino Mega
    '0045', // Arduino Mega 2560
    '0046', // Arduino Due
    '0047', // Arduino Nano
    '0048', // Arduino Nano 33
    '004A', // Arduino Micro
    '004B', // Arduino Leonardo
    '004C', // Arduino Leonardo ETH
    '004D', // Arduino Pro Mini
    '7523', // Arduino Nano Amazon knock-off
];
const arduinoVendorIds = [
    '2A03', // Arduino SA Amazon knock-off
    '2A05', // Arduino SA Amazon knock-off
    '2341', // Arduino
    '03EB', // Arduino SA
    '1A86', // Arduino Nano Amazon knock-off
];
export default async function findArduinoDevices() {
    const devices = {};
    devices.usbDevices = usb.getDeviceList();
    devices.usbArduinoDevices = devices.usbDevices.filter(device => isLikelyArduino(device));
    devices.serialPorts = await SerialPort.list();
    devices.serialArduinoPorts = devices.serialPorts.filter(port => {
        return arduinoVendorIds.includes(port.vendorId) || arduinoProductIds.includes(port.productId);
    });

    console.log('=== Exported Arduino Devices ===');
    console.log(devices);
    return devices;
}
async function findUSBDevices() {
    console.log('Scanning for USB devices...\n');

    // Get all USB devices
    const usbDevices = usb.getDeviceList();
    
    console.log('=== USB Devices ===');
    usbDevices.forEach((device, index) => {
        try {
            const descriptor = device.deviceDescriptor;
            console.log(`\nDevice ${index + 1}:`);
            console.log(`Vendor ID: 0x${descriptor.idVendor.toString(16).padStart(4, '0')}`);
            console.log(`Product ID: 0x${descriptor.idProduct.toString(16).padStart(4, '0')}`);
            
            // Try to get manufacturer and product details
            try {
                device.open();
                const manufacturer = device.getStringDescriptor(descriptor.iManufacturer);
                const product = device.getStringDescriptor(descriptor.iProduct);
                console.log(`Manufacturer: ${manufacturer}`);
                console.log(`Product: ${product}`);
                device.close();
            } catch (e) {
                // Some devices may not provide string descriptors
                console.log('Additional details not available');
            }
        } catch (err) {
            console.log(`Error getting device ${index + 1} details:`, err.message);
        }
    });
}

async function findSerialPorts() {
    console.log('\n=== Serial Ports ===');
    try {
        // Get list of all serial ports
        const ports = await SerialPort.list();
        
        if (ports.length === 0) {
            console.log('No serial ports found');
            return;
        }

        ports.forEach((port, index) => {
            console.log(`\nPort ${index + 1}:`);
            console.log(port);
        });
    } catch (err) {
        console.error('Error listing serial ports:', err);
    }
}

// Function to determine if a device might be an Arduino
function isLikelyArduino(device) {
    // Common Arduino vendor IDs
    const arduinoVendorIDs = [
        0x2341, // Arduino
        0x2A03, // Arduino as well
        0x1B4F, // SparkFun
        0x0403  // FTDI (many Arduino clones)
    ];
    
    return arduinoVendorIDs.includes(device.deviceDescriptor.idVendor);
}

// async function findArduinoDevices() {
//     console.log('\n=== Potential Arduino Devices ===');
//     const devices = usb.getDeviceList();
//     const arduinoDevices = devices.filter(isLikelyArduino);
    
//     if (arduinoDevices.length === 0) {
//         console.log('No Arduino devices found');
//         return;
//     }

//     arduinoDevices.forEach((device, index) => {
//         console.log(`\nArduino Device ${index + 1}:`);
//         console.log(`Vendor ID: 0x${device.deviceDescriptor.idVendor.toString(16)}`);
//         console.log(`Product ID: 0x${device.deviceDescriptor.idProduct.toString(16)}`);
//     });
// }

// Main execution
async function main() {
    try {
        await findUSBDevices();
        await findSerialPorts();
        await findArduinoDevices();
    } catch (err) {
        console.error('Error in main execution:', err);
    }
}

// Run the script
main().then(() => {
    console.log('\nScan complete!');
    process.exit();
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

// Handle cleanup
process.on('SIGINT', () => {
    console.log('\nCleaning up...');
    process.exit();
});