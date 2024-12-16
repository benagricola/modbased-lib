import {
    IImplementation,
    TDiscoverFunction,
    TReadRegisterFunction,
    TWriteRegisterFunction,
    IDiscoverOptions,
    IReadRegisterOptions,
    IWriteRegisterOptions,
    ILoadDefinitionOptions,
} from "./implementation";

import { ICommunication, } from "./communication";

// Protocol types
export enum DeviceProtocol {
    Unknown  = "unknown",
    Modbus   = "modbus",   // Generic modbus, unknown variant
    RTU      = "modbus-rtu",
    Huanyang = "modbus-huanyang"
}

// Device groups
export enum DeviceGroup {
    Unknown = "unknown",
    VFD     = "vfd",
}

// Device types
export enum DeviceType {
    Unknown = "unknown",
    Generic = "generic",
    Shihlin = "shihlin", // TODO: This doesn't feel right, Shihlink is a manufacturer.
}

// Device register types
export enum DeviceRegisterType {
    ReadOnly = "ro",
    ReadWrite = "rw",
    Status = "status",
    Control = "control",
}

export type TDeviceRegisterOptions = {
    [value: number]: string;
}

// Device register definitions
export type TDeviceRegisterDefinition = {
    name: string;
    type: DeviceRegisterType;
    description: string;
    min?: number;
    max?: number;
    options?: TDeviceRegisterOptions;
    displayFormat?(response: number[]): string;
    writeFormat?(value: string): number[];
}
export type TDeviceRegisterDefinitions = {
    [address: string]: TDeviceRegisterDefinition;
}
export type TDeviceRegisterValue = number;

export type TDeviceRegisters = {
    [address: number]: TDeviceRegisterValue;
}

// Device coil definitions
export type TDeviceCoilDefinition = {
    name: string;
    description: string;
}
export type TDeviceCoilDefinitions = {
    [address: number]: TDeviceCoilDefinition;
};

export type TDeviceCoils = {
    [address: number]: boolean;
}

export type TDeviceDefinitions = [TDeviceRegisterDefinitions, TDeviceCoilDefinitions];

// Discoverable device types
export interface IDiscoverableDevice {
    Discover: TDiscoverFunction;
    TypeName: string;
}
export type TDiscoverableDevices = IDiscoverableDevice[];

// Device type
export type TDevice = {
    ToString(): string;
    readRegisterFunction: TReadRegisterFunction;
    writeRegisterFunction: TWriteRegisterFunction;
    protocolType: DeviceProtocol;
    discoveryStatus?: string;
    deviceGroup: DeviceGroup;
    deviceType: DeviceType;
    manufacturer?: string;
    model?: string;
    deviceDefinitions?: TDeviceDefinitions;
    registerRanges?: [number, number][];
    coilRanges?: [number, number][];
    registers: TDeviceRegisters;
    coils: TDeviceCoils;
};
export type TDevices = TDevice[];

export interface IBaseDevice {
    SetCommunication(comm: ICommunication): void;
}

/*
 * BaseDevice
 *
 * Base class for all Devices. This class provides a common
 * interface for all Devices, and provides a static method
 * for discovering devices.
 *
 * This class aims to represent modbus-like devices that have
 * registers and coils, but there is no requirement that a device
 * must be modbus, or even on a modbus network. This library can
 * essentially be used to represent any device, as long as its
 * data can be represented as registers and / or coils.
 *
 * Each device type definition should have a unique protocolType,
 * deviceGroup and deviceType triplet, and should implement all the
 * required methods if they differ from its parent class.
 */
export abstract class Device implements TDevice {
    protocolType = DeviceProtocol.Unknown;
    deviceGroup = DeviceGroup.Unknown;
    deviceType = DeviceType.Unknown;

    static comm: ICommunication;

    manufacturer?: string | undefined;
    model?: string | undefined;

    discoveryStatus?: string | undefined;

    // Field definitions are shared between all instances
    static registerDefinitions: TDeviceRegisterDefinitions = {};
    static coilDefinitions: TDeviceCoilDefinitions = {};
    static definitionsLoaded = false;

    // Registers and coils are instance-specific
    registers: TDeviceRegisters = {};
    coils: TDeviceCoils = {};

    static discoverFunction(_comm: ICommunication, _discoverOpts: IDiscoverOptions): Promise<TDevice[]> {
        throw new Error("discoverFunction not implemented");
    }

    static loadDefinitions(_options?: ILoadDefinitionOptions): Promise<TDeviceDefinitions> {
        // Default implementation tries to load definitions from
        throw new Error("loadDefinitions not implemented");
    }

    static SetCommunication(comm: ICommunication): void {
        Device.comm = comm;
    }

    async readRegisterFunction(_comm: ICommunication, _readRegisterOpts: IReadRegisterOptions): Promise<number[]> {
        throw new Error("readRegisterFunction not implemented");
    }

    async writeRegisterFunction(_comm: ICommunication, _writeRegisterOpts: IWriteRegisterOptions): Promise<boolean> {
        throw new Error("writeRegisterFunction not implemented");
    }

    ToString(): string {
        return "Unknown Device";
    }


    constructor(device?: TDevice, impl?: IImplementation) {
        if(device) {
            this.protocolType = device.protocolType;
            this.deviceGroup = device.deviceGroup;
            this.deviceType = device.deviceType;
            this.manufacturer = device.manufacturer;
            this.model = device.model;
        }

        // Allow implementation to be overridden
        if(impl) {
            if(impl.readRegisterFunction) {
                this.readRegisterFunction = impl.readRegisterFunction;
            }
            if(impl.writeRegisterFunction) {
                this.writeRegisterFunction = impl.writeRegisterFunction;
            }
            if(impl.discoverFunction) {
                Device.discoverFunction = impl.discoverFunction;
            }
            if(impl.loadDefinitions) {
                Device.loadDefinitions = impl.loadDefinitions;
            }
        }
    }

    static async LoadDefinitions(options?: ILoadDefinitionOptions): Promise<void> {
        if(!this.definitionsLoaded || options?.forceLoad) {
            [this.registerDefinitions, this.coilDefinitions] = await this.loadDefinitions(options);
            this.definitionsLoaded = true;
        }
    }

    static async Discover(options: IDiscoverOptions): Promise<TDevice[]> {
        return await this.discoverFunction(Device.comm, options);
    }

    async ReadRegister(options: IReadRegisterOptions): Promise<number[]> {
        return await this.readRegisterFunction(Device.comm, options);
    }

    async WriteRegister(options: IWriteRegisterOptions): Promise<boolean> {
        return await this.writeRegisterFunction(Device.comm, options);
    }
}
