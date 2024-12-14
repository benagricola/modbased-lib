import { ModbusDevice, ModbusDeviceGroup } from "../../Device";
import { ModbusRTUCompatibleDevice } from "./Generic";

export class VFD extends ModbusRTUCompatibleDevice {
    static TypeName = "VFD (Modbus RTU Compatible)";
    deviceGroup: ModbusDeviceGroup = ModbusDeviceGroup.VFD;

    ToString(): string {
        return `${VFD.TypeName} Device (${this.manufacturer} ${this.model}) on port ${this.port},  address ${this.address}`;
    }
}

export function isVFD(device: ModbusDevice): device is VFD {
    return device.deviceGroup === ModbusDeviceGroup.VFD;
}