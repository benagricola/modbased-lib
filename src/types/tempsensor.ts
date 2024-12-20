import { DeviceGroup, IDeviceType } from '../device';

export function TemperatureSensorDeviceType<TBase extends new (...args: any[]) => {}>(Base: TBase) {
    return class extends Base {
        private temperature: number = 0;
        private humidity: number = 0;

        getTemperature() {
            return this.temperature;
        }

        getHumidity() {
            return this.humidity;
        }

        setProperties(temperature: number, humidity: number) {
            this.temperature = temperature;
            this.humidity = humidity;
        }

        ToString(): string {
            return `Temperature Sensor at ${this.temperature}°C and ${this.humidity}% humidity`;
        };
    };
}
