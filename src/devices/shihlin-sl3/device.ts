import { VFDDeviceType } from "../../types/vfd";
import { ModbusRTUDevice } from "../../protocols/modbus-rtu";
import { Device } from "../../device";
import { isTimeoutError } from "../../util/guards";
import { registerDefinitions } from "./registers";

import type { TDeviceRegisterDefinitions } from "../../device";
import type { ICommunicationChannel } from "../../communication";

// Map inverter model numbers to the relevant details
export type ShihlinInverterModel = {
    voltage: number;
    phases: number;
    power: number;
    ToString: () => string;
}

const inverterModelPower: { [key: number]: number } = {
    2: 0.4,
    3: 0.75,
    4: 1.5,
    5: 2.2
};

const inverterModelVoltage: { [key: number]: number } = {
    1: 220,
    2: 440
};

const inverterModelPhases: { [key: number]: number } = {
    1: 1,
    2: 3
};

const decodeInverterModel = (modelData: number): ShihlinInverterModel => {
    const vphases = Math.floor(modelData / 100);
    return {
        voltage: inverterModelVoltage[vphases] || 0,
        phases: inverterModelPhases[vphases] || 0,
        power: inverterModelPower[modelData-100] || 0,
    } as ShihlinInverterModel;
}

// Discover Shihlin SL3 devices and instantiate them as an instance of ShihlinSL3Device
export const ShihlinSL3DiscoveryFunction = async (startAddress: number, addressCount: number, channel: ICommunicationChannel) => {
    const devices: ShihlinSL3Device[] = [];
    for (let i = startAddress; i < startAddress + addressCount; i++) {
        try {
            const device = new ShihlinSL3Device();
            device.setAddress(i);

            const modelData = await device.readRegister(0x2710, 1, channel);
            if(modelData === null) {
                console.log("No register read from device at address", i);
                continue;
            }

            device.setDiscoveryStatus("Device-specific register read successful");
            const model = decodeInverterModel(modelData[0]);
            device.setVfdProperties(model.voltage, model.phases, model.power);
            devices.push(device);

        } catch (error: any) {
            if(error && isTimeoutError(error)) {
                // Do not report timeouts during discovery.
                continue;
            }

            // TODO: Check for timeout and do not report.
            // Timeouts will occur when a device is not present.
            channel.error(`Error during discovery: ${error}`);
        }
    }
    return devices;
};

export function ShihlinSL3<TBase extends new (...args: any[]) => Device>(Base: TBase) {
    const ShihlinSL3Device = class extends Base {
        registerDefinitions: TDeviceRegisterDefinitions = registerDefinitions;
        constructor(...args: any[]) {
            super(...args);
            this.manufacturer = "Shihlin";
            this.model = "SL3";

        }
    }

    return ShihlinSL3Device;
}

export const ShihlinSL3Device = ShihlinSL3(VFDDeviceType(ModbusRTUDevice));
export type ShihlinSL3Device  = InstanceType<typeof ShihlinSL3Device>;