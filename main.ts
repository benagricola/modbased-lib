#!/usr/bin/env node

import { ShihlinVFD } from "./src/types/devices/vfd/shihlin-sl3";

import { ICommunication, IRequest, IResponse, ICommunicationOptions } from "./src/types/communication";
import { CommunicationTimeoutError } from "./src/types/communication";
import { SerialPortStream, OpenOptions } from "@serialport/stream";
import { autoDetect, AutoDetectTypes } from '@serialport/bindings-cpp'

const binding = autoDetect();

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

interface NodeUSBConnOptions extends ICommunicationOptions {
    baudRate: number;
    path: string;
    binding: AutoDetectTypes;
    dataBits: number;
    stopBits: number;
    parity: OpenOptions['parity'];
    timeout: number;
}

class NodeUSBConn implements ICommunication {
    options: NodeUSBConnOptions = {
        baudRate: 9600,
        path: '/dev/ttyACM0',
        binding: binding,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        timeout: 1000,
        autoOpen: false,
    };

    port: SerialPortStream

    constructor(options?: NodeUSBConnOptions) {
        if(options) {
            this.options = options;
        }
        this.port = new SerialPortStream(this.options as OpenOptions);
    }

    SetOptions(options: NodeUSBConnOptions): void {
        this.options = options;
        this.port.update(options);
    }

    async Close(): Promise<void> {
        return new Promise<void>((r, e) => {
            this.port.close((err) => {
                if (err) {
                    e(err);
                } else {
                    r();
                }
            });
        });
    }


    async Open(): Promise<void> {
        if(this.port.isOpen) {
            return;
        }

        if(!this.port.opening) {
            this.port.open();
        }
        return new Promise<void>((r, e) => {
            this.port.once('open', () => {
                r();
            });
        });
    }

    async Request(req: IRequest): Promise<IResponse> {
        if(!this.port.isOpen) {
            throw new Error("Port is not open.");
        }

        // Modbus specifies a 3.5 character delay between messages.
        // We should wait for 4 characters before writing the next message.
        this.port.flush();

        await delay(4 * 1000 / this.options.baudRate);

        // Calculate the expected transmission and reception time.
        const roundTripDelay = (req.buffer.length + req.expectedLength) * 1000 / this.options.baudRate;

        // Write the request to the port.
        this.port.write(req.buffer);
        this.port.flush();

        return new Promise<IResponse>((r, e) => {
            let receivedData = new Uint8Array(0);

            // Set a timeout on the response, account for the round
            // trip delay based on baud rate.
            const timeoutId = setTimeout(() => {
                e(new CommunicationTimeoutError(`No response received within ${roundTripDelay + this.options.timeout}ms`));
            }, roundTripDelay + this.options.timeout);

            this.port.on('data', (data) => {
                clearTimeout(timeoutId);
                const newData = new Uint8Array(receivedData.length + data.length);
                newData.set(receivedData);
                newData.set(data, receivedData.length);
                receivedData = newData;
                if(receivedData.length >= req.expectedLength) {
                    r({data: receivedData});
                }
            });

            this.port.on('error', (err) => {
                clearTimeout(timeoutId);
                e(err);
            });
        });
    }

    Error(message: string): void {
        console.error(message);
    }

    Debug(message: string): void {
        console.debug(message);
    }
}
const conn = new NodeUSBConn({
    baudRate: 38400,
    path: '/dev/ttyACM0',
    binding: binding,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    timeout: 100,
    autoOpen: false,
});


ShihlinVFD.SetCommunication(conn);

const main = async () => {
    await conn.Open();
    console.log("Connection open.");
    const devices = await ShihlinVFD.Discover({startAddress: 1, addressCount: 5})

    console.log(devices);
    await conn.Close();

    console.log("Waiting for devices to be discovered...");
};

main();