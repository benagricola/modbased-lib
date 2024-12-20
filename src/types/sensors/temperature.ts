import { DeviceGroup, IDeviceType } from '../../device';

export function TemperatureSensorDeviceType<TBase extends new (...args: any[]) => {}>(Base: TBase) {
    return class extends Base {
        private temperature: number = 0;

        getTemperature() {
            return this.temperature;
        }

        setTemperature(temperature: number) {
            this.temperature = temperature;
        }

        ToString(): string {
            return `Temperature Sensor at ${this.temperature}°C`;
        };
    };
}
