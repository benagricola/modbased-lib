import { TModbusDevice, ModbusDeviceGroup } from "../Device";
import { ModbusRTUDevice } from "./RTU";

export class ModbusRTUCompatibleVFD extends ModbusRTUDevice {
    static TypeName = "Modbus-RTU Compatible VFD";
    deviceGroup: ModbusDeviceGroup = ModbusDeviceGroup.VFD;

    voltage: number = 0;
    phases: number = 0;
    power: number = 0;

    ToString(): string {
        return `${ModbusRTUCompatibleVFD.TypeName} Device (${this.manufacturer} ${this.model}) on port ${this.port},  address ${this.address}`;
    }
}

export function isVFD(device: TModbusDevice): device is ModbusRTUCompatibleVFD {
    return device.deviceGroup === ModbusDeviceGroup.VFD;
}