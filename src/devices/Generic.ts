import { TModbusDevice, ModbusDeviceType, Device, ModbusProtocol, ModbusDeviceGroup } from '../Device';

// Implement a Modbus RTU compatible device, that uses the 0x08 echo
// test command for discovery. This is a generic device that can get
// and set registers and coils, but will not be able to decode the
// responses in a meaningful way.
export class ModbusDevice extends Device implements TModbusDevice {
    deviceGroup: ModbusDeviceGroup = ModbusDeviceGroup.Unknown;
    deviceType: ModbusDeviceType = ModbusDeviceType.Generic;

    static TypeName = "Generic Modbus";

    discoveryStatus?: string | undefined = "Unknown";

    port: number = -1;
    address: number = -1;

    ToString(): string {
        return `${ModbusDevice.TypeName} Device (${this.manufacturer ?? 'Unknown Manufacturer,'} ${this.model ?? 'Unknown Model'}) on port ${this.port},  address ${this.address}`;
    }
}