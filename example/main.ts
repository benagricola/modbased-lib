#!/usr/bin/env node

import { DeviceFactory } from "../src/device";
import { NodeUSBChannel } from "../src/channels/node-usb";
import { LocalFileDefinitionLoader } from "../src/loaders/local-file";
import { autoDetect } from '@serialport/bindings-cpp'

const binding = autoDetect();

const conn = new NodeUSBChannel({
    baudRate: 9600,
    path: '/dev/ttyACM0',
    binding: binding,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    timeout: 250,
    autoOpen: false,
});

import "../src/discoverygroups/all";
import { SHT20Device } from "../src/devices/sht20/device";


const definitionLoader = new LocalFileDefinitionLoader();

const main = async () => {
    console.log("Waiting for devices to be discovered...");
    await conn.open();

    const devices = await DeviceFactory.discover(1, 5, conn, definitionLoader);

    console.log("Discovered devices:", devices);
    while (true) {
        // Query device status
        for (const device of devices as SHT20Device[]) {
            // Read temperature and humidity
            const temperature = await device.readTemperatureAndHumidity(conn);

            console.log("Device at address", device.getAddress(), "has temperature", temperature.temperature, "and humidity", temperature.humidity);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("Discovered devices:", devices);
    await conn.close();

};

main();