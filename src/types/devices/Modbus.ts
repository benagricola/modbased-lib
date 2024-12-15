import { TDevice, DeviceType, Device, DeviceGroup, DeviceProtocol } from '../Device';

// Generic modbus-like device with some basic properties.
// All devices subclassing this have at least a port and address.
export abstract class ModbusDevice extends Device implements TDevice {
    deviceGroup: DeviceGroup = DeviceGroup.Unknown;
    deviceType: DeviceType = DeviceType.Generic;
    protocolType: DeviceProtocol = DeviceProtocol.Modbus;

    static TypeName = "Generic Modbus";

    address: number = -1;

    ToString(): string {
        return `${ModbusDevice.TypeName} Device (${this.manufacturer ?? 'Unknown Manufacturer,'} ${this.model ?? 'Unknown Model'}) at address ${this.address}`;
    }
}

// All more-specific modbus device types start their type name with "modbus-".
export function isModbusDevice(device: TDevice): device is ModbusDevice {
    return device.protocolType.startsWith("modbus");
}