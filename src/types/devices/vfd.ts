import { Device, DeviceGroup, TDevice } from "../device";
import { ModbusDevice } from "./modbus";
import { ModbusRTUDevice } from "./rtu";
import { isModbusRTUDevice } from "../../util/guards";
import { IImplementation } from "../implementation";

export abstract class VFD extends Device implements ModbusDevice {
    private modbusRTUDevice: ModbusRTUDevice | null = null;

    static TypeName = "Generic VFD";
    deviceGroup: DeviceGroup = DeviceGroup.VFD;

    voltage: number = 0;
    phases: number = 0;
    power: number = 0;

    constructor(device?: TDevice, impl?: IImplementation) {
        super(device, impl);
        if(isModbusRTUDevice(this)) {
            this.modbusRTUDevice = this;
            this.protocolType = this.modbusRTUDevice.protocolType;
        } else {
            console.log("VFD device is not a ModbusRTUDevice");
        }
    }

    get address(): number {
        return this.modbusRTUDevice?.address ?? -1;
    }

    ToString(): string {
        if(this.modbusRTUDevice) {
            return this.modbusRTUDevice.ToString();
        }
        return `${VFD.TypeName} Device (${this.manufacturer} ${this.model}) at address ${this.address}`;
    }
}
