import type { ICommunicationProtocolMixin, ICommunicationChannel, ICommunicationProtocol, CommunicationProtocolRecords } from "./communication";
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
    Unknown = "Unknown",
    VFD     = "VFD",
}

// Device types
export enum DeviceType {
    Generic = "Generic",
    Sensor = "Sensor",
    VFD = "VFD",
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
    getType(): string;
    getRegisters(): TDeviceRegisters;
    getCoils(): TDeviceCoils;
    getCommunicationProtocol(symbol: Symbol): ICommunicationProtocolMixin | undefined;
    getCommunicationProtocols(): CommunicationProtocolRecords;
    getComponentStatus(): string[];
    setManufacturer(manufacturer: string): void;
    setModel(model: string): void;
    setDiscoveryStatus(status: string): void;
    toString(): string;
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

    static async discover(startAddress: number, addressCount: number, channel: ICommunicationChannel, definitionLoader: IDefinitionLoader): Promise<IDevice[]> {
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
    manufacturer: string = "Unknown";
    model: string = "Unknown";
    type: DeviceType = DeviceType.Generic;

    discoveryStatus: string = "";

    protected protocols: CommunicationProtocolRecords = new Map();

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

    getType(): string {
        return this.type;
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

    getCommunicationProtocol<T extends ICommunicationProtocolMixin>(symbol: Symbol): T | undefined {
        return this.protocols.get(symbol)?.protocol as T;
    }

    getCommunicationProtocols(): CommunicationProtocolRecords {
        return this.protocols;
    }

    // Iterate over the prototype chain, running the getStatus method
    // of each mixin to build a string representation of the device.
    getComponentStatus(): string[] {
        const statuses = [];
        let proto = Object.getPrototypeOf(this);
        while (proto) {
            if (proto.hasOwnProperty("getStatus")) {
                statuses.push(...proto.getStatus.call(this) as string[]);
            }
            proto = Object.getPrototypeOf(proto);
        }
        return statuses;
    }

    toString(): string {
        return `${this.getName()} (${this.getComponentStatus().join(", ")})`;
    }
}