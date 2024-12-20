import { CommunicationProtocolSymbol } from "./communication";
import type { ICommunicationChannel, ICommunicationProtocol } from "./communication";
import type { IDefinitionLoader } from "./definition";

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
export interface IDeviceRegisterDefinition {
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
    [address: string]: IDeviceRegisterDefinition;
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

export interface IDeviceType {
    getTypeName(): string;
    getDeviceGroup(): DeviceGroup;
}

export interface IDiscoverable {
    (startAddress: number, addressCount: number, channel: ICommunicationChannel): Promise<InstanceType<typeof Device>[]>;
}

export interface IDevice {
    getName(): string;
    getRegisters(): TDeviceRegisters;
    getCoils(): TDeviceCoils;
    getCommunicationProtocol(): ICommunicationProtocol;
    hasCommunicationProtocol(): boolean;
    setManufacturer(manufacturer: string): void;
    setModel(model: string): void;
    setDiscoveryStatus(status: string): void;
}

export interface IDeduplicatable {
    (devices: Device[]): Device[];
}

export class DeviceFactory {
    static discoveryFunctions: IDiscoverable[] = [];
    static deduplicationFunctions: IDeduplicatable[] = [];

    static addDiscoveryFunction(discoveryFunction: IDiscoverable): void {
        this.discoveryFunctions.push(discoveryFunction);
    }

    static addDeduplicationFunction(deduplicationFunction: IDeduplicatable): void {
        this.deduplicationFunctions.push(deduplicationFunction);
    }

    static async discover(startAddress: number, addressCount: number, channel: ICommunicationChannel, definitionLoader: IDefinitionLoader): Promise<Device[]> {
        let devices = [];
        for (const discoveryFunction of this.discoveryFunctions) {
            devices.push(...await discoveryFunction(startAddress, addressCount, channel));
        }

        // Deduplicate devices based on address, prioritising the last device found.
        for (const deduplicationFunction of this.deduplicationFunctions) {
            devices = deduplicationFunction(devices);
        }

        for (const device of devices) {
            device.setDefinitionLoader(definitionLoader);
        }

        return devices;
    }
}

export class Device implements IDevice {
    manufacturer: string = "unknown";
    model: string = "unknown";
    discoveryStatus: string = "";

    definitionLoader: IDefinitionLoader | null = null;

    protected registers: TDeviceRegisters = {};
    protected coils: TDeviceCoils = {};

    setDiscoveryStatus(status: string): void {
        this.discoveryStatus = status;
    }

    setManufacturer(manufacturer: string): void {
        this.manufacturer = manufacturer;
    }

    setModel(model: string): void {
        this.model = model;
    }

    getName(): string {
        return `${this.manufacturer} ${this.model}`;
    }

    getRegisters(): TDeviceRegisters {
        return this.registers;
    }

    getCoils(): TDeviceCoils {
        return this.coils;
    }


    setDefinitionLoader(definitionLoader: IDefinitionLoader): void {
        this.definitionLoader = definitionLoader;
    }

    getDefinitionLoader(): IDefinitionLoader | null {
        return this.definitionLoader;
    }

    getCommunicationProtocol(): ICommunicationProtocol {
        if(this.hasCommunicationProtocol()) {
            return this as unknown as ICommunicationProtocol;
        }
        throw new Error("Device has no communication protocol attached");
    }

    hasCommunicationProtocol(): boolean {
        return (this as any)[CommunicationProtocolSymbol] === true;
    }
}