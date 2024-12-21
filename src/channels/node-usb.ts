import { IRequest, IResponse, ICommunicationChannel, ICommunicationChannelOptions, CommunicationTimeoutError } from "../communication";
import { SerialPortStream, OpenOptions } from "@serialport/stream";
import { autoDetect, AutoDetectTypes } from '@serialport/bindings-cpp'

const binding = autoDetect();

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface NodeUSBChannelOptions extends ICommunicationChannelOptions {
    baudRate: number;
    path: string;
    binding: AutoDetectTypes;
    dataBits: number;
    stopBits: number;
    parity: OpenOptions['parity'];
    timeout: number;
}

export class NodeUSBChannel implements ICommunicationChannel {
    private requestQueue: { req: IRequest, resolve: (value: IResponse | PromiseLike<IResponse>) => void, reject: (reason?: any) => void }[] = [];
    private receivedData: Uint8Array = new Uint8Array(0);
    private timeoutId: NodeJS.Timeout | null = null;

    private options: NodeUSBChannelOptions = {
        baudRate: 9600,
        path: '/dev/ttyACM0',
        binding: binding,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        timeout: 1000,
        autoOpen: false,
    };

    port: SerialPortStream

    constructor(options?: NodeUSBChannelOptions) {
        if(options) {
            this.options = options;
        }
        this.port = new SerialPortStream(this.options as OpenOptions);
    }

    setOptions(options: ICommunicationChannelOptions): void {
        this.options = options as NodeUSBChannelOptions;
        this.port.update(this.options);
    }

    async close(): Promise<void> {
        return new Promise<void>((r, e) => {
            this.port.close((err) => {
                if (err) {
                    e(err);
                } else {
                    this.port.removeAllListeners();
                    r();
                }
            });
        });
    }


    async open(): Promise<void> {
        if(this.port.isOpen) {
            return;
        }

        if(!this.port.opening) {
            this.port.open();
        }
        return new Promise<void>((r, e) => {
            this.port.once('open', () => {
                this.port.on('data', this.dataListener.bind(this));
                this.port.on('error', this.errorListener.bind(this));
                r();
            });
        });
    }

    isOpen(): boolean {
        return this.port.isOpen;
    }

    async request(req: IRequest): Promise<IResponse> {
        if (!this.port.isOpen) {
            throw new Error("Port is not open.");
        }

        // Modbus specifies a 3.5 character delay between messages.
        // Flush the port, and then wait for the delay.
        this.port.flush();
        await delay(4 * 1000 / this.options.baudRate);

        // Calculate the expected transmission and reception time.
        const roundTripDelay = (req.buffer.length + req.expectedLength) * 1000 / this.options.baudRate;

        return new Promise<IResponse>((resolve, reject) => {
            this.requestQueue.push({ req, resolve, reject });

            this.timeoutId = setTimeout(() => {
                // Remove the request from the queue if it has
                // timed out.
                this.requestQueue.shift();
                const err = new CommunicationTimeoutError(`No response received within ${roundTripDelay + this.options.timeout}ms`);
                this.flushPort();
                reject(err);
            }, roundTripDelay + this.options.timeout);

            // Write the request to the port.
            // console.log("REQ ", req.buffer);
            this.port.write(req.buffer);
            this.port.drain();

        });
    }

    private flushPort(): void {
        this.port.flush();
        this.receivedData = new Uint8Array(0);
    }

    private dataListener(data: Uint8Array): void {
        const currentRequest = this.requestQueue.shift();
        if(!currentRequest) {
            return;
        }

        const newData = new Uint8Array(this.receivedData.length + data.length);
        newData.set(this.receivedData);
        newData.set(data, this.receivedData.length);
        this.receivedData = newData;

        // If we have not received enough data, put the request back
        // on the queue and wait for more.
        if(this.receivedData.length < currentRequest.req.expectedLength) {
            this.requestQueue.unshift(currentRequest);
            return;
        }

        // Only clear the timeout if we have received all the data.
        // Otherwise we will clear the timeout when we receive the
        // first chunk of data, which would cause us to wait
        // indefinitely for the remaining bytes.
        if(this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        // console.log("RES ", this.receivedData);
        currentRequest.resolve(new currentRequest.req.response(this.receivedData, currentRequest.req));
        this.flushPort();
    }

    private errorListener(err: Error): void {
        // Clear the timeout straight away, as
        // we will not receive any more data.
        if(this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        const currentRequest = this.requestQueue.shift();
        if(currentRequest) {
            currentRequest.reject(err);
            this.flushPort();
        }

    }

    error(message: string): void {
        console.error(message);
    }

    debug(message: string): void {
        console.debug(message);
    }
}