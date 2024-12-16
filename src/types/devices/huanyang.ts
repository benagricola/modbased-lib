import { ICommunication } from "../communication";
import { IDiscoverOptions } from "../implementation";
import { TDevice, DeviceProtocol } from "../device";
import { ModbusDevice } from "./modbus";

export class ModbusHuanyangDevice extends ModbusDevice {
    protocolType: DeviceProtocol = DeviceProtocol.RTU;
    static TypeName = "Generic Modbus Huanyang-style";

    ToString(): string {
        return `${ModbusHuanyangDevice.TypeName} Device (${this.manufacturer} ${this.model}) at address ${this.address}`;
    }

    static async discoverFunction(comm: ICommunication, discoverOpts: IDiscoverOptions): Promise<TDevice[]> {
        const devices: TDevice[] = [new ModbusHuanyangDevice()];
        return devices;
    }
}