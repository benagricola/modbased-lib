import type { IDevice } from "./device";

export const CommunicationProtocolSymbol = Symbol("CommunicationProtocol");

export interface ICommunicationChannelOptions {
    [key: string]: any;
}

export interface IRequest {
    address: number;
    get data(): Uint8Array;
    get buffer(): Uint8Array;
    get expectedLength(): number;
    response: new(bytes: Uint8Array, request: IRequest) => IResponse;
}

export interface IResponse {
    address: number;
    data: Uint8Array;
    isValid(): boolean;
    get validationError(): string;
}

export interface IResponseValidation {
    validate(bytes: Uint8Array, request: IRequest): boolean;
    get validationError(): string;
}

export interface ICommunicationError {}

export class CommunicationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CommsError";
    }
}

export class CommunicationTimeoutError extends CommunicationError {
    isTimeout: boolean = true;
    constructor(message: string) {
        super(message);
        this.name = "CommsTimeoutError";
    }
}

// Define protocol type interface
export interface ICommunicationProtocolMixin {
    [CommunicationProtocolSymbol]: boolean;
}

export type CommunicationProtocolRecord = {
    name: string,
    protocol: ICommunicationProtocolMixin
}

export type CommunicationProtocolRecords = Map<Symbol, CommunicationProtocolRecord>;

// Communication protocols are dependant on the device being communicated with.
export interface ICommunicationProtocol {
    discover: (startAddress: number, addressCount: number) => Promise<IDevice[]>;
    readRegister: (address: number, addressCount: number, comm: ICommunicationChannel) => Promise<number[]>;
    writeRegister: (address: number, value: number) => Promise<void>;
    readCoil: (address: number) => Promise<boolean>;
    writeCoil: (address: number, value: boolean) => Promise<void>;
}

export interface ICommunicationChannel {
    setOptions: (options: ICommunicationChannelOptions) => void;
    isOpen: () => boolean;
    open: () => void;
    request: (req: IRequest) => Promise<IResponse>;
    close: () => void;
    error: (message: string) => void;
    debug: (message: string) => void;
}
