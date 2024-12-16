import { TDevice, DeviceProtocol, DeviceGroup, DeviceType } from '../types/device';
import { ModbusDevice } from '../types/devices/modbus';
import { ModbusRTUDevice } from '../types/devices/rtu';
import { VFD } from '../types/devices/vfd';

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

export function isTimeoutError(error: any): boolean {
    return error.isTimeout ?? false;
}
