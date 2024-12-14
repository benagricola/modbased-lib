import { TModbusDevice, ModbusDeviceGroup, ModbusProtocol } from "../Device";
import { ModbusDevice } from "./Generic";

export class ModbusRTUDevice extends ModbusDevice {
    protocolType: ModbusProtocol = ModbusProtocol.RTU;
    static TypeName = "Generic Modbus-RTU Compatible";

    ToString(): string {
        return `${ModbusRTUDevice.TypeName} Device (${this.manufacturer} ${this.model}) on port ${this.port},  address ${this.address}`;
    }
}

export function isModbusRTUDevice(device: TModbusDevice): device is ModbusRTUDevice {
    return device.protocolType === ModbusProtocol.RTU;
}