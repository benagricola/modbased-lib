import { ICommunication } from "../Communication";
import { IDiscoverOptions } from "../Implementation";
import { TDevice, DeviceProtocol } from "../Device";
import { ModbusDevice } from "./Modbus";

const rtuEchoTestDiscoveryRequest = Uint8Array.from([0x08, 0x00, 0x00, 0xBE, 0xEF]);

export class ModbusRTUDevice extends ModbusDevice {
    protocolType: DeviceProtocol = DeviceProtocol.RTU;
    static TypeName = "Generic Modbus-RTU Compatible";

    ToString(): string {
        return `${ModbusRTUDevice.TypeName} Device (${this.manufacturer} ${this.model}) at address ${this.address}`;
    }

    static async discoverFunction(comm: ICommunication, discoverOpts: IDiscoverOptions): Promise<TDevice[]> {
        const devices: TDevice[] = [];
        for (let i = discoverOpts.startAddress; i < discoverOpts.startAddress + discoverOpts.addressCount; i++) {

            try {
                const res = await comm.Request({
                    address: i,
                    data: Uint16Array.from(rtuEchoTestDiscoveryRequest),
                });

                // If we received a matching response, we have found a device.
                if(res.data.length === 5 && res.data.every((value, index) => value === rtuEchoTestDiscoveryRequest[index])) {
                    const device = new ModbusRTUDevice();
                    device.address = i;
                    device.discoveryStatus = "RTU Echo Test Passed";
                    devices.push(device);
                }
            } catch (error: any) {
                comm.Error(`Error during discovery: ${error}`);
            }
        }

        return devices;
    }

}