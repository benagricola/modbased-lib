import { TDevice, DeviceType, Device, DeviceGroup, DeviceProtocol } from '../device';
import { IImplementation } from '../implementation';
import { isModbusDevice } from '../../util/guards';

// Generic modbus-like device with some basic properties.
// All devices subclassing this have at least a port and address.
export abstract class ModbusDevice extends Device implements TDevice {
    deviceGroup: DeviceGroup = DeviceGroup.Unknown;
    deviceType: DeviceType = DeviceType.Generic;
    protocolType: DeviceProtocol = DeviceProtocol.Modbus;

    static TypeName = "Generic Modbus";

    address: number = -1;

    constructor(device?: TDevice, impl?: IImplementation) {
        super(device, impl);
        if(device) {
            if(isModbusDevice(device)) {
                this.address = device.address;
            }
        }
    }

    ToString(): string {
        return `${ModbusDevice.TypeName} Device (${this.manufacturer ?? 'Unknown Manufacturer,'} ${this.model ?? 'Unknown Model'}) at address ${this.address}`;
    }
}