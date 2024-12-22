import { DeviceType } from '../../device';

export function TemperatureSensorDeviceType<TBase extends new (...args: any[]) => {}>(Base: TBase) {
    return class extends Base {
        type = DeviceType.Sensor;

        private temperature: number = 0;

        getTemperature() {
            return this.temperature;
        }

        setTemperature(temperature: number) {
            this.temperature = temperature;
        }

        getStatus(): string[] {
            return [`Temperature: ${this.temperature}°C`]
        };
    };
}
