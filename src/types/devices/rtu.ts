import { ICommunication, IRequest, IResponse } from "../communication";
import { IDiscoverOptions, IImplementation, IReadRegisterOptions } from "../implementation";
import { TDevice, DeviceProtocol } from "../device";
import { ModbusDevice } from "./modbus";
import { crc16 } from "../../util/crc";
import { isTimeoutError } from "../../util/guards";

const ModbusMinAddress = 1;
const ModbusMaxAddress = 247;

function concatArrayBuffers(a: ArrayBuffer, b: ArrayBuffer): Uint8Array {
    const ab = new Uint8Array(a.byteLength + b.byteLength);
    ab.set(new Uint8Array(a), 0);
    ab.set(new Uint8Array(b), a.byteLength);
    return ab;
}

export function DataTo16BitArray(data: Uint8Array): number {
    const dv = new DataView(data.buffer, 0);
    return dv.getUint16(0, false);
}

export interface IModbusRTURequest extends IRequest {
    address: number;
    function: number;
    get crc(): Uint8Array;
    ResponseType(): IModbusRTUResponse;
}

export interface IModbusRTUResponse extends IResponse {
    address: number;
    function: number;
    get length(): number;
}

export abstract class ModbusRTURequest implements IModbusRTURequest {
    address: number = 1;
    function: number = 0x00;

    protected addrFunc(): Uint8Array {
        return Uint8Array.from([this.address, this.function]);
    }

    abstract get data(): Uint8Array;

    get crc(): Uint8Array {
        return crc16(this.data);
    }

    get buffer(): Uint8Array {
        return concatArrayBuffers(this.data, this.crc);
    }

    get expectedLength(): number {
        // Calculate the expected response length.
        // Modbus RTU response is:
        // 1 byte address, 1 byte function, 2 bytes CRC-16
        return 4;
    }

    ResponseType(): IModbusRTUResponse {
        return ModbusRTUResponse;
    }

    constructor(address: number) {
        if(address < ModbusMinAddress) {
            throw new Error(`Modbus RTU broadcasts are not supported.`);
        }
        if(address > ModbusMaxAddress) {
            throw new Error(`Invalid Modbus RTU address: ${address}`);
        }
        this.address = address;
    }
}

export class ModbusRTUResponse implements IModbusRTUResponse {
    address: number = -1;
    function: number = 0x00;

    data: Uint8Array;

    get length(): number {
        return this.data.length;
    }

    constructor(res: IResponse) {
        const data = res.data.slice(0, res.data.length - 2);
        const crc = crc16(data);
        const expectedCrc = res.data.slice(res.data.length - 2);
        if(crc.every((v, i) => v !== expectedCrc[i])) {
            throw new Error(`Invalid CRC in response: ${res.data}}`);
        }
        this.address = data[0];
        this.function = data[1];
        this.data = data.slice(2);
    }
}

const rtuEchoTestDiscoveryRequest = Uint8Array.from([0xBE, 0xEF]);

export class ModbusRTUDiagnosticsRequest extends ModbusRTURequest {
    function = 0x08;
    subFunction: number = 0x00;
    echoData: Uint8Array = new Uint8Array();

    get data(): Uint8Array {
        return concatArrayBuffers(this.addrFunc(), this.echoData);
    }

    get expectedLength(): number {
        // Address, function, CRC-16,
        // 2 bytes for sub-function, 2 bytes for data.
        return super.expectedLength + 4;
    }

    constructor(address: number, subFunction?: number, data?: number[]) {
        super(address);
        if(subFunction) {
            this.subFunction = subFunction;
        }
        if(data) {
            this.echoData = Uint8Array.from(data);
        }
        this.echoData = concatArrayBuffers(Uint16Array.from([this.subFunction]), data ? Uint16Array.from(data) : rtuEchoTestDiscoveryRequest);
    }
}

export class ModbusRTUReadRegisterRequest extends ModbusRTURequest implements IRequest {
    function = 0x03;
    register: number = 0;
    numRegisters: number = 1; // 16-bit registers

    get data(): Uint8Array {
        return concatArrayBuffers(this.addrFunc(), Uint16Array.from([this.register, this.numRegisters]));
    }

    get expectedLength(): number {
        // Calculate the expected response length.
        // Modbus RTU response is:
        // 1 byte address, 1 byte function, 2 bytes CRC-16 (super.responseLength),
        // 1 byte for number of registers being read, 2 bytes per register.
        return super.expectedLength + 1 + (this.numRegisters * 2);
    }

    constructor(address: number, register: number, numRegisters: number) {
        super(address)
        this.register = register;
        this.numRegisters = numRegisters;
    }
}

export class ModbusRTUWriteSingleRegisterRequest extends ModbusRTURequest implements IRequest {
    function: number = 0x06;
    register: number = 0;
    registerValue: number = 0;

    get data(): Uint8Array {
        return concatArrayBuffers(this.addrFunc(), Uint16Array.from([this.register, this.registerValue]));
    }


    get expectedLength(): number {
        // Address, function, CRC-16, 2 bytes for register address, 2 bytes for value.
        return super.expectedLength + 4;
    }

    constructor(address: number, register: number, value: number) {
        super(address);
        this.register = register;
        this.registerValue = value;
    }
}

export class ModbusRTUWriteMultipleRegisterRequest extends ModbusRTURequest implements IRequest {
    function: number = 0x10;
    startRegister: number = 0;
    registerValues: number[] = [];

    get data(): Uint8Array {
        return concatArrayBuffers(this.addrFunc(), Uint16Array.from([this.startRegister, this.registerValues.length, ...this.registerValues]));
    }

    get expectedLength(): number {
        // Address, function, CRC-16,
        // 2 bytes for register address,
        // 2 bytes for number of registers written.
        return super.expectedLength + 4;
    }

    constructor(address: number, startRegister: number, value: number[]) {
        super(address);
        this.startRegister  = startRegister;
        this.registerValues = value;
    }
}

export class ModbusRTUDevice extends ModbusDevice {
    protocolType: DeviceProtocol = DeviceProtocol.RTU;
    static TypeName = "Generic Modbus-RTU Compatible";

    constructor(device?: TDevice, impl?: IImplementation) {
        super(device, impl);
    }

    ToString(): string {
        return `${ModbusRTUDevice.TypeName} Device (${this.manufacturer} ${this.model}) at address ${this.address}`;
    }

    static async discoverFunction(comm: ICommunication, discoverOpts: IDiscoverOptions): Promise<TDevice[]> {
        const devices: TDevice[] = [];
        for (let i = discoverOpts.startAddress; i < discoverOpts.startAddress + discoverOpts.addressCount; i++) {
            try {
                const req = new ModbusRTUDiagnosticsRequest(i);
                const res = new ModbusRTUResponse(await comm.Request(req));

                console.log(res.length);
                console.log(req.expectedLength);
                if(res.length !== req.expectedLength) {
                    comm.Debug(`Invalid response length from device at address ${i}`);
                    continue;
                }
                // First 2 bytes are the address and function code.
                console.log(res.data);
                console.log(req.buffer);
                const valid = res.data.every((v, i) => v === req.buffer[i+1]);

                if(!valid) {
                    comm.Debug(`Invalid response from device at address ${i}: ${res.data} !=`);
                    continue;
                }
                const device = new ModbusRTUDevice();
                device.address = i;
                device.discoveryStatus = "RTU Echo Test Passed";
                devices.push(device);

            } catch (error: any) {
                if(isTimeoutError(error)) {
                    // Do not report timeouts during discovery.
                    continue;
                }

                // TODO: Check for timeout and do not report.
                // Timeouts will occur when a device is not present.
                comm.Error(`Error during discovery: ${error}`);
            }
        }
        return devices;
    }

}