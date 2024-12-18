#!/usr/bin/env node

import { DeviceFactory } from "./src/device";
import { NodeUSBChannel } from "./src/channels/node-usb";

import { autoDetect } from '@serialport/bindings-cpp'

const binding = autoDetect();

const conn = new NodeUSBChannel({
    baudRate: 38400,
    path: '/dev/ttyACM0',
    binding: binding,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    timeout: 100,
    autoOpen: false,
});

import "./src/discoverygroups/all";

const main = async () => {
    console.log("Waiting for devices to be discovered...");
    await conn.open();
    const devices = await DeviceFactory.discover(1, 5, conn);
    console.log(devices);
    await conn.close();

};

main();