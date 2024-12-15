export interface ICommunicationOptions {
    [key: string]: any;
}

export interface IRequest {
    address: number;
    data: Uint8Array | Uint16Array;
}
export interface IResponse {
    data: Uint8Array | Uint16Array;
}

export interface ICommunication {
    Request: (req: IRequest) => Promise<IResponse>;
    Error: (message: string) => void;
}
