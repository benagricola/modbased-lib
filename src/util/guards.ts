import { TDevice, DeviceProtocol, DeviceGroup, DeviceType } from '../types/Device';
import { ModbusDevice } from '../types/devices/Modbus';
import { ModbusRTUDevice } from '../types/devices/RTU';
import { VFD } from '../types/devices/VFD';

export function isModbusRTUDevice(device: TDevice): device is ModbusRTUDevice {
    return device.protocolType === DeviceProtocol.RTU;
}

export function isModbusDevice(device: TDevice): device is ModbusDevice {
    return device.protocolType === DeviceProtocol.Modbus;
}

export function isVFD(device: TDevice): device is VFD {
    return device.deviceGroup === DeviceGroup.VFD;
}

export function isShihlin(device: TDevice): device is ModbusRTUDevice {
    return device.deviceType === DeviceType.Shihlin;
}
