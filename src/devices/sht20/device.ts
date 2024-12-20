import { ModbusRTUDevice, ModbusRTURegisterType } from "../../protocols/modbus-rtu";
import { Device, DeviceRegisterType } from "../../device";
import { TemperatureSensorDeviceType } from "../../types/tempsensor";
import { ICommunicationChannel } from "../../communication";
import { isTimeoutError } from "../../util/guards";

const decodeTemperatureAndHumidity = (data: number[]): { temperature: number, humidity: number } => {
    return {
        temperature: data[0] / 10,
        humidity: data[1] / 10
    }
}
// Discover Shihlin SL3 devices and instantiate them as an instance of ShihlinSL3Device
export const SHT20DiscoveryFunction = async (startAddress: number, addressCount: number, channel: ICommunicationChannel) => {
    const devices: SHT20Device[] = [];
    for (let i = startAddress; i < startAddress + addressCount; i++) {
        try {
            const device = new SHT20Device();
            device.setAddress(i);
            const res = await device.readRegister(0x0001, 2, channel, ModbusRTURegisterType.INPUT);
            if(res === null) {
                continue;
            }

            const tandH = decodeTemperatureAndHumidity(res);
            device.setProperties(tandH.temperature, tandH.humidity);

            device.setDiscoveryStatus("Device-specific register read successful");
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

export function SHT20<TBase extends new (...args: any[]) => Device>(Base: TBase) {
    const SHT20Device = class extends Base {
        constructor(...args: any[]) {
            super(...args);
            this.manufacturer = "Tronix Lab";
            this.model = "SHT20"
        }

        async readTemperatureAndHumidity(channel: ICommunicationChannel): Promise<{ temperature: number, humidity: number }> {
            const protocol = this.getCommunicationProtocol() as unknown as InstanceType<typeof ModbusRTUDevice>;
            const res = protocol.readRegister(0x0001, 2, channel, ModbusRTURegisterType.INPUT);

            return decodeTemperatureAndHumidity(await res);
        }
    }

    return SHT20Device;
}

export const SHT20Device = SHT20(TemperatureSensorDeviceType(ModbusRTUDevice));
export type SHT20Device  = InstanceType<typeof SHT20Device>;