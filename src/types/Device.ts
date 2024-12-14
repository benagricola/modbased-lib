import { IReadRegisterOptions, IWriteRegisterOptions, IDiscoverOptions, ILoadDefinitionOptions, IModbusCommunicationOptions, ILoadDefinitionLoaderOptions } from "./Communication";

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

// Device register definitions
export type TDeviceRegisterDefinition = {
    name: string;
    type: DeviceRegisterType;
    description: string;
    options?: { [value: number]: string };
    displayFormat?(response: number[]): string;
    writeFormat?(value: string): number[];
}
export type TDeviceRegisterDefinitions = {
    [address: string]: TDeviceRegisterDefinition;
}
export type TDeviceRegisterValue = number;

export type TDeviceRegisters = {
    [address: string]: TDeviceRegisterValue;
}

// Device coil types
export type TDeviceCoilDefinition = {
    name: string;
    description: string;
}
export type TDeviceCoilDefinitions = {
    [address: string]: TDeviceCoilDefinition;
};

export type TDeviceCoilValue = boolean;

export type TDeviceCoils = {
    [address: string]: TDeviceCoilValue;
}

export type TDeviceDefinitions = [TDeviceRegisterDefinitions, TDeviceCoilDefinitions];

// Discoverable device types
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
    registers: TDeviceRegisters;
    coils: TDeviceCoils;
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

    // Field definitions are shared between all instances
    static registerDefinitions: TDeviceRegisterDefinitions = {};
    static coilDefinitions: TDeviceCoilDefinitions = {};
    static definitionsLoaded = false;

    // Registers and coils are instance-specific
    registers: TDeviceRegisters = {};
    coils: TDeviceCoils = {};

    static discoverFunction(_: IDiscoverOptions): Promise<TModbusDevice[]> {
        throw new Error("discoverFunction not implemented");
    }

    static loadDefinitions(options?: ILoadDefinitionLoaderOptions): Promise<TDeviceDefinitions> {
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

    constructor(commOpts?: IModbusCommunicationOptions) {

        if(commOpts) {
            if(commOpts.readRegisterFunction) {
                this.readRegisterFunction = commOpts.readRegisterFunction;
            }
            if(commOpts.writeRegisterFunction) {
                this.writeRegisterFunction = commOpts.writeRegisterFunction;
            }
            if(commOpts.discoverFunction) {
                Device.discoverFunction = commOpts.discoverFunction;
            }
            if(commOpts.loadDefinitions) {
                Device.loadDefinitions = commOpts.loadDefinitions;
            }
        }
    }

    static async LoadDefinitions(options?: ILoadDefinitionOptions): Promise<void> {
        if(!this.definitionsLoaded || options?.forceLoad) {
            [this.registerDefinitions, this.coilDefinitions] = await this.loadDefinitions(options?.loaderOptions);
            this.definitionsLoaded = true;
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
