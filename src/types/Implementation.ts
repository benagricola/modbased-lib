import { ICommunication } from './Communication';
import { TDeviceDefinitions, TDevice } from './Device';

export type TReadRegisterFunction = (comm: ICommunication, options: IReadRegisterOptions) => Promise<number[]>;
export type TWriteRegisterFunction = (comm: ICommunication, options: IWriteRegisterOptions) => Promise<boolean>;
export type TDiscoverFunction = (comm: ICommunication, options: IDiscoverOptions) => Promise<TDevice[]>;
export type TLoadDefinitionsFunction = (options?: ILoadDefinitionOptions) => Promise<TDeviceDefinitions>;

// Options required to discover, read and write to devices.
// Use commOptions to pass any implementation-specific options.
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

export interface ILoadDefinitionOptions {
    forceLoad?: boolean;
}

export interface IImplementation {
    readRegisterFunction: TReadRegisterFunction;
    writeRegisterFunction:TWriteRegisterFunction;
    discoverFunction: TDiscoverFunction;
    loadDefinitions: TLoadDefinitionsFunction;
}