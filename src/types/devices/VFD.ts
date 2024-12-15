import { Device, DeviceGroup } from "../Device";
import { ModbusDevice } from "./Modbus";

export class VFD extends Device implements ModbusDevice {
    static TypeName = "Generic VFD";
    deviceGroup: DeviceGroup = DeviceGroup.VFD;

    address: number = -1;

    voltage: number = 0;
    phases: number = 0;
    power: number = 0;

    ToString(): string {
        return `${VFD.TypeName} Device (${this.manufacturer} ${this.model}) at address ${this.address}`;
    }
}
