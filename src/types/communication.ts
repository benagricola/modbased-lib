export interface ICommunicationOptions {
    [key: string]: any;
}

export interface IRequest {
    address: number;
    Response: new(bytes: Uint8Array, request: IRequest) => IResponse;
    get data(): Uint8Array;
    get buffer(): Uint8Array;
    get expectedLength(): number;
}

export interface IResponse {
    get data(): Uint8Array;
    get request(): IRequest;
}

export interface ICommunicationError {

}
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

export interface ICommunication {
    SetOptions(options: ICommunicationOptions): void;
    Open: () => void;
    Request: (req: IRequest) => Promise<IResponse>;
    Close: () => void;
    Error: (message: string) => void;
    Debug: (message: string) => void;
}
