import { TDeviceDefinitions, TModbusDevice } from './Device';

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

export interface ILoadDefinitionLoaderOptions {
    [key: string]: any;
}

export interface ILoadDefinitionOptions {
    forceLoad: boolean;
    loaderOptions?: ILoadDefinitionLoaderOptions;
}

export interface IModbusCommunicationOptions {
    readRegisterFunction: (options: IReadRegisterOptions) => Promise<number[]>;
    writeRegisterFunction: (options: IWriteRegisterOptions) => Promise<boolean>;
    discoverFunction: (options: IDiscoverOptions) => Promise<TModbusDevice[]>;
    loadDefinitions: (options?: ILoadDefinitionOptions) => Promise<TDeviceDefinitions>;
}