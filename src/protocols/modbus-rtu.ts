import { CommunicationProtocolSymbol, ICommunicationProtocolMixin } from '../communication';
import { Device } from '../device';
import { crc16 } from '../util/crc';
import { isTimeoutError } from '../util/guards';
import type { ICommunicationChannel, IRequest, IResponse } from '../communication';

export const ModbusRTUSymbol = Symbol("ModbusRTU");

const ModbusMinAddress = 1;
const ModbusMaxAddress = 247;

function concatArrayBuffers(a: ArrayBuffer, b: ArrayBuffer): Uint8Array {
    const ab = new Uint8Array(a.byteLength + b.byteLength);
    ab.set(new Uint8Array(a), 0);
    ab.set(new Uint8Array(b), a.byteLength);
    return ab;
}

export function DataToNumber(data: Uint8Array): number {
    const dv = new DataView(data.buffer, 0);
    return dv.getUint16(0, false);
}

export enum ModbusRTURegisterType {
    INPUT = 0x04,
    HOLDING = 0x03,
}

export interface IModbusRTURequest extends IRequest {
    address: number;
    function: number;
    get crc(): Uint8Array;
}

export interface IModbusRTUResponse extends IResponse {
    address: number;
    function: number;
    isValid(): boolean;
    get length(): number;
}

export abstract class ModbusRTURequest implements IModbusRTURequest {
    address: number = 1;
    function: number = 0x00;

    response: new(bytes: Uint8Array, request: IRequest) => IResponse = ModbusRTUResponse;

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

export enum ModbusRTUExceptionCode {
    ILLEGAL_FUNCTION = 0x01,
    ILLEGAL_DATA_ADDRESS = 0x02,
    ILLEGAL_DATA_VALUE = 0x03,
}


export class ModbusRTUResponse implements IModbusRTUResponse {
    address: number = -1;
    function: number = 0x00;
    request: IRequest;

    protected valid: boolean = true;
    protected validationErr: string = "";

    data: Uint8Array = new Uint8Array();

    get length(): number {
        // When length is read, the original address, function and
        // CRC bytes have been removed from the data, so we need to
        // add 4 to the length to account for that.
        return this.data.length + 4;
    }

    isValid(): boolean {
        return this.valid;
    }

    get validationError(): string {
        return this.validationErr;
    }

    constructor(bytes: Uint8Array, request: IRequest) {
        this.request = request;

        const expectedFunction = (request as ModbusRTURequest).function;

        // Validate function code
        if(bytes[1] !== expectedFunction) {
            this.valid = false;

            this.validationErr = `Function code mismatch: ${bytes[1]} != ${expectedFunction}`;
            // Check if this matches an error code from the device.
            if(bytes[1] === 0x80 + expectedFunction) {
                this.validationErr = `Device returned error code ${bytes[1]}: ${ModbusRTUExceptionCode[bytes[2]]}`;
            }

            return;
        }

        // Validate response length.
        // Comms layer should already check this based on
        // the expectedLength property.
        if(bytes.length < request.expectedLength) {
            this.valid = false;
            this.validationErr = `Response length ${bytes.length} is less than expected ${request.expectedLength}`;
            return;
        }

        // Split the CRC from the data.
        const dataStartIdx = 2;
        const dataEndIdx = bytes.length - 2;
        const dataWithAddrFunc = bytes.slice(0, dataEndIdx);
        const crc = crc16(dataWithAddrFunc);
        const expectedCrc = bytes.slice(dataEndIdx);

        // Validate the CRC
        if(crc.every((v, i) => v !== expectedCrc[i])) {
            this.valid = false;
            this.validationErr = `CRC mismatch: ${crc} != ${expectedCrc}`;
            return;
        }

        // Assign data fields
        this.address = dataWithAddrFunc[0];
        this.function = dataWithAddrFunc[1];
        this.data = dataWithAddrFunc.slice(dataStartIdx); // Remove address and function.
    }
}

export class ModbusRTUDiagnosticsRequest extends ModbusRTURequest {
    function = 0x08;
    subFunction: number = 0x00;
    diagnosticData: Uint8Array = new Uint8Array();

    response: new(bytes: Uint8Array, request: IRequest) => IResponse = ModbusRTUDiagnosticsResponse;

    get data(): Uint8Array {
        return concatArrayBuffers(this.addrFunc(), concatArrayBuffers(Uint16Array.from([this.subFunction]), this.diagnosticData));
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

        this.diagnosticData = data ? Uint8Array.from(data) : Uint8Array.from([0xBE, 0xEF]);
    }
}

class ModbusRTUDiagnosticsResponse extends ModbusRTUResponse {
    subFunction: number = 0;
    diagnosticData: Uint8Array = new Uint8Array();

    constructor(bytes: Uint8Array, request: IRequest) {
        super(bytes, request as ModbusRTUDiagnosticsRequest);

        // Do not continue if this is not a valid ModbusRTUresponse.
        if(!this.isValid()) {
            return
        }

        const req = request as ModbusRTUDiagnosticsRequest;

        this.subFunction = new DataView(this.data.buffer).getUint16(0, false);

        this.diagnosticData = this.data.slice(2);

        if(this.subFunction != req.subFunction || this.diagnosticData.every((v, i) => v !== req.diagnosticData[i])) {
            this.valid = false;
            this.validationErr = `Diagnostic data mismatch: ${this.subFunction} ${this.diagnosticData} != ${req.subFunction} ${req.diagnosticData}`;
        }
    }
}

export class ModbusRTUReadRegisterRequest extends ModbusRTURequest {
    function = 0x03;
    register: number = 0;
    numRegisters: number = 1; // 16-bit registers

    response: new(bytes: Uint8Array, request: IRequest) => IResponse = ModbusRTUReadRegisterResponse;

    get data(): Uint8Array {
        // Create a buffer and DataView for the register and numRegisters
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);

        // Set the register and numRegisters in big-endian order
        view.setUint16(0, this.register, false); // false for big-endian
        view.setUint16(2, this.numRegisters, false); // false for big-endian

        // Extract the bytes
        const registerBytes = new Uint8Array(buffer.slice(0, 2));
        const numRegistersBytes = new Uint8Array(buffer.slice(2, 4));

        return concatArrayBuffers(this.addrFunc(), concatArrayBuffers(registerBytes, numRegistersBytes));
    }

    get expectedLength(): number {
        // Calculate the expected response length.
        // Modbus RTU response is:
        // 1 byte address, 1 byte function, 2 bytes CRC-16 (super.responseLength),
        // 1 byte for number of registers being read, 2 bytes per register.
        return super.expectedLength + 1 + (this.numRegisters * 2);
    }

    constructor(address: number, register: number, numRegisters: number, registerType? : ModbusRTURegisterType) {
        super(address);
        this.register = register;
        this.numRegisters = numRegisters;
        if(registerType) {
            this.function = registerType;
        }
    }
}

export class ModbusRTUReadRegisterResponse extends ModbusRTUResponse {
    register: number = 0;
    numRegisters: number = 0;
    registerValues: number[] = [];

    constructor(bytes: Uint8Array, request: IRequest) {
        super(bytes, request);

        // Do not continue if this is not a valid ModbusRTUresponse.
        if(!this.isValid()) {
            return
        }

        const req = request as ModbusRTUReadRegisterRequest;

        this.register = (this.request as ModbusRTUReadRegisterRequest).register;
        const numRegistersRead = this.data[0]/2; // 2 bytes per register
        if(numRegistersRead != req.numRegisters) {
            this.valid = false;
            this.validationErr = `Number of registers read (${numRegistersRead}) does not match number of registers requested (${req.numRegisters})`;
            return;
        }

        this.numRegisters = numRegistersRead;

        // Each register is 2 bytes
        const dv = new DataView(this.data.buffer, 1);
        for(let i = 0; i < this.numRegisters; i++) {
            this.registerValues.push(dv.getUint16(i * 2, false));
        }
    }
}

export class ModbusRTUWriteSingleRegisterRequest extends ModbusRTURequest {
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

export class ModbusRTUWriteMultipleRegisterRequest extends ModbusRTURequest {
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

export const ModbusRTUDiscoveryFunction = async (startAddress: number, addressCount: number, channel: ICommunicationChannel): Promise<InstanceType<typeof ModbusRTUDevice>[]> => {
    const devices: InstanceType<typeof ModbusRTUDevice>[] = [];
    for (let i = startAddress; i < startAddress + addressCount; i++) {
        try {
            const req = new ModbusRTUDiagnosticsRequest(i);
            const res = await channel.request(req) as ModbusRTUDiagnosticsResponse;
            if(!res.isValid()) {
                channel.debug(`Invalid response from device at address ${i}: ${res.validationError}`);
                continue;
            }
            const device = new ModbusRTUDevice();
            device.setAddress(i);
            device.setDiscoveryStatus("RTU Echo Test Passed");
            devices.push(device);

        } catch (error: any) {
            if(isTimeoutError(error)) {
                // Do not report timeouts during discovery.
                continue;
            }

            // TODO: Check for timeout and do not report.
            // Timeouts will occur when a device is not present.
            channel.error(`Error during discovery: ${error}`);
        }
    }
    return devices;
};

// Modbus RTU devices can be deduplicated based on their addresses matching.
// This is necessary in case we have multiple discovery methods, for example if a
// specific device type has a more targeted discovery method.
export const ModbusRTUDeduplicationFunction = (devices: Device[]): Device[] => {
    const deviceMap = new Map<number, ModbusRTUDevice>();

    for (const d of devices as ModbusRTUDevice[]) {
        deviceMap.set(d.getAddress(), d);
    }

    return Array.from(deviceMap.values());
};

export function ModbusRTUProtocol<TBase extends new (...args: any[]) => Device>(Base: TBase) {
    const ModbusRTUDevice = class extends Base {
        address: number = -1;
        constructor(...args: any[]) {
            super(...args);
            // Ensure the class is marked as a communication protocol
            // and register the protocol with the device.
            this.protocols.set(ModbusRTUSymbol, { name: "Modbus RTU", protocol: this as ICommunicationProtocolMixin });
        }

        [CommunicationProtocolSymbol]: boolean = true;

        setAddress(address: number): void {
            this.address = address;
        }

        getAddress(): number {
            return this.address;
        }

        async readRegister(registerAddress: number, numRegisters: number, channel: ICommunicationChannel, registerType?: ModbusRTURegisterType): Promise<number[]> {
            const req = new ModbusRTUReadRegisterRequest(this.address, registerAddress, numRegisters, registerType);
            const res = await channel.request(req) as ModbusRTUReadRegisterResponse;
            if(!res.isValid()) {
                channel.debug(`Invalid response from device at address ${this.address}: ${res.validationError}`);
                return Promise.reject();
            }

            for (let i = 0; i < numRegisters; i++) {
                this.registers[registerAddress + i] = res.registerValues[i];
            }

            return res.registerValues;
        }

        async writeRegister(address: number, value: number, channel: ICommunicationChannel): Promise<void> {
            const req = new ModbusRTUWriteSingleRegisterRequest(this.address, address, value);
            const res = await channel.request(req);
            if(!res.isValid()) {
                channel.debug(`Invalid response from device at address ${this.address}: ${res.validationError}`);
                return Promise.reject();
            }
            this.registers[address] = value;
        }

        async readCoil(address: number, numCoils: number, channel: ICommunicationChannel): Promise<boolean> {
            console.log("MODBUSRTU READ COIL");
            return true;
        }

        async writeCoil(address: number, value: boolean, channel: ICommunicationChannel): Promise<void> {
            console.log("MODBUSRTU WRITE COIL");
        }

    }

    return ModbusRTUDevice;

}

export const ModbusRTUDevice = ModbusRTUProtocol(Device);
export type ModbusRTUDevice = InstanceType<typeof ModbusRTUDevice>;
