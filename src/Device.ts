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

export type TDeviceRegisterOptions = {
    [key: number]: string;
};

export type TDeviceRegister = {
    name: string;
    type: DeviceRegisterType;
    description: string;
    options?: TDeviceRegisterOptions;
    displayFormat?(response: number[]): string;
    writeFormat?(value: string): number[];
}
export type TDeviceRegisters = {
    [address: string]: TDeviceRegister;
}

// Device coil types
export type TDeviceCoil = {
    name: string;
    description: string;
}
export type TDeviceCoils = {
    [address: string]: TDeviceCoil;
};

export interface IDiscoverOptions {
    baudRate: number;
    startAddress: number;
    addressCount: number;
}

export interface IReadRegisterOptions {
    address: number;
    count: number;
}

export interface IWriteRegisterOptions {
    address: number;
    value: number;
}

export interface IModbusDeviceOptions {
    readRegisterFunction: (options: IReadRegisterOptions) => Promise<number[]>;
    writeRegisterFunction: (options: IWriteRegisterOptions) => Promise<boolean>;
    discoverFunction: (options: IDiscoverOptions) => Promise<TModbusDevice[]>;
    loadDefinitions: () => [TDeviceRegisters, TDeviceCoils];
}

export interface IDiscoverableDevice {
    Discover(options: IDiscoverOptions): Promise<TModbusDevice[]>;
    TypeName: string;
}
export type TDiscoverableDevices = IDiscoverableDevice[];

// Modbus device types
export type TModbusDevice = {
    ToString(): string;
    readRegisterFunction: (options: IReadRegisterOptions) => Promise<number[]>;
    writeRegisterFunction: (options: IWriteRegisterOptions) => Promise<boolean>;
    discoveryStatus?: string;
    protocolType: ModbusProtocol;
    deviceGroup: ModbusDeviceGroup;
    deviceType: ModbusDeviceType;
    manufacturer?: string;
    model?: string;
    port?: number;
    baudRate?: number;
    address?: number;
    coils: TDeviceCoils;
    registers: TDeviceRegisters;
};
export type TModbusDevices = TModbusDevice[];

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
export abstract class Device implements TModbusDevice {
    protocolType = ModbusProtocol.Unknown
    deviceGroup = ModbusDeviceGroup.Unknown
    deviceType = ModbusDeviceType.Unknown

    manufacturer?: string | undefined;
    model?: string | undefined;

    registers: TDeviceRegisters = {};
    coils: TDeviceCoils         = {};

    static discoverFunction(_: IDiscoverOptions): Promise<TModbusDevice[]> {
        throw new Error("discoverFunction not implemented");
    }

    static loadDefinitions(): [TDeviceRegisters, TDeviceCoils] {
        throw new Error("loadDefinitions not implemented");
    }

    async readRegisterFunction(_: IReadRegisterOptions): Promise<number[]> {
        throw new Error("readRegisterFunction not implemented");
    }

    async writeRegisterFunction(_: IWriteRegisterOptions): Promise<boolean> {
        throw new Error("writeRegisterFunction not implemented");
    }

    ToString(): string {
        return "Unknown Modbus Device";
    }

    constructor(options?: IModbusDeviceOptions) {
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
            if(options.discoverFunction) {
                Device.discoverFunction = options.discoverFunction;
            }
        }
    }

    static async Discover(options: IDiscoverOptions): Promise<TModbusDevice[]> {
        return await this.discoverFunction(options);
    }

    async ReadRegister(options: IReadRegisterOptions): Promise<number[]> {
        return await this.readRegisterFunction(options);
    }

    async WriteRegister(options: IWriteRegisterOptions): Promise<boolean> {
        return await this.writeRegisterFunction(options);
    }
}
