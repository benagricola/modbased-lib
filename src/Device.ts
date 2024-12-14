// Discovery command types
export type DiscoveryCommand = {
    rrfCode: string;
    discoveryData: number[];
    expectBytes: number;
    processResponse?: (response: number[], device: ModbusDevice) => void;
}

// Modbus constants
export const ModbusMaxAddress = 127;

// Protocol types
export enum ModbusProtocol {
    Unknown = "unknown",
    RTU = "modbus-rtu",
    Huanyang = "modbus-huanyang"
}

// Device groups
export enum ModbusDeviceGroup {
    Unknown = "unknown",
    VFD = "vfd",
}

// Device types
export enum ModbusDeviceType {
    Unknown = "unknown",
    Generic = "generic",
    Shihlin = "shihlin",
}

// Device register types
export enum DeviceRegisterType {
    ReadOnly = "ro",
    ReadWrite = "rw",
    Status = "status",
    Control = "control",
}

export type DeviceRegisterOption = {
    value: string;
    text: string;
}
export type DeviceRegisterOptions = DeviceRegisterOption[];

export type DeviceRegister = {
    name: string;
    type: DeviceRegisterType;
    description: string;
    options?: DeviceRegisterOptions;
    displayFormat?(response: number[]): string;
    writeFormat?(value: string): number[];
}
export type DeviceRegisters = {
    [address: string]: DeviceRegister;
}

// Device coil types
export type DeviceCoil = {
    name: string;
    description: string;
}
export type DeviceCoils = {
    [address: string]: DeviceCoil;
};

export interface DiscoveryOptions {
    baudRate: number;
    startAddress: number;
    addressCount: number;
}

export interface ReadRegisterOptions {
    address: number;
    count: number;
}

export interface WriteRegisterOptions {
    address: number;
    value: number;
}

export interface ModbusDeviceOptions {
    readRegisterFunction: (options: ReadRegisterOptions) => Promise<number[]>;
    writeRegisterFunction: (options: WriteRegisterOptions) => Promise<boolean>;
    discoveryFunction: (options: DiscoveryOptions) => Promise<ModbusDevice[]>;
    loadDefinitions: () => [DeviceRegisters, DeviceCoils];
}

export interface DiscoverableDevice {
    Discover(options: DiscoveryOptions): Promise<ModbusDevice[]>;
    TypeName: string;
}
export type DiscoverableDevices = DiscoverableDevice[];

// Modbus device types
export type ModbusDevice = {
    ToString(): string;
    readRegisterFunction: (options: ReadRegisterOptions) => Promise<number[]>;
    writeRegisterFunction: (options: WriteRegisterOptions) => Promise<boolean>;
    discoveryStatus?: string;
    protocolType: ModbusProtocol;
    deviceGroup: ModbusDeviceGroup;
    deviceType: ModbusDeviceType;
    manufacturer?: string;
    model?: string;
    port?: number;
    baudRate?: number;
    address?: number;
    coils: DeviceCoils;
    registers: DeviceRegisters;
};
export type ModbusDevices = ModbusDevice[];

/*
 * BaseModbusDevice
 *
 * Base class for all Modbus devices. This class provides a common
 * interface for all Modbus devices, and provides a static method
 * for discovering devices on a Modbus network.
 *
 * Devices do not have to be fully modbus-compatible, but need to
 * at least support modbus-style addressing, framing and timing.
 * Discovery and configuration commands can use the M260.4 command
 * to send vendor-specific configuration commands, or fall back to
 * using the default M260.1 and M261.1 commands if they are RTU
 * compliant.
 *
 * Each device type definition should have a unique protocolType,
 * deviceGroup and deviceType triplet, and should implement a
 * discoveryCommand if this differs from its parent class.
 */
export abstract class BaseModbusDevice implements ModbusDevice {
    protocolType = ModbusProtocol.Unknown
    deviceGroup = ModbusDeviceGroup.Unknown
    deviceType = ModbusDeviceType.Unknown

    manufacturer?: string | undefined;
    model?: string | undefined;

    registers: DeviceRegisters = {};
    coils: DeviceCoils         = {};

    static discoveryMacroName: string = "_modbus_discover.g";

    static discoveryFunction(_: DiscoveryOptions): Promise<ModbusDevice[]> {
        throw new Error("discoveryFunction not implemented");
    }

    static loadDefinitions(): [DeviceRegisters, DeviceCoils] {
        throw new Error("loadDefinitions not implemented");
    }

    async readRegisterFunction(_: ReadRegisterOptions): Promise<number[]> {
        throw new Error("readRegisterFunction not implemented");
    }

    async writeRegisterFunction(_: WriteRegisterOptions): Promise<boolean> {
        throw new Error("writeRegisterFunction not implemented");
    }

    ToString(): string {
        return "Unknown Modbus Device";
    }

    constructor(options?: ModbusDeviceOptions) {
        // RRF does not support the 0x08 command with its
        // inbuilt modbus-rtu implementation, so we build
        // the command string manually here.
        this.registers = {};
        this.coils = {};

        if(options) {
            if(options.readRegisterFunction) {
                this.readRegisterFunction = options.readRegisterFunction;
            }
            if(options.writeRegisterFunction) {
                this.writeRegisterFunction = options.writeRegisterFunction;
            }
            if(options.discoveryFunction) {
                BaseModbusDevice.discoveryFunction = options.discoveryFunction;
            }
        }
    }

    static async Discover(options: DiscoveryOptions): Promise<ModbusDevice[]> {
        return await this.discoveryFunction(options);
    }

    async ReadRegister(options: ReadRegisterOptions): Promise<number[]> {
        return await this.readRegisterFunction(options);
    }

    async WriteRegister(options: WriteRegisterOptions): Promise<boolean> {
        return await this.writeRegisterFunction(options);
    }
}
