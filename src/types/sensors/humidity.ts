import { DeviceType } from '../../device';

export function HumiditySensorDeviceType<TBase extends new (...args: any[]) => {}>(Base: TBase) {
    return class extends Base {
        type = DeviceType.Sensor;

        private humidity: number = 0;

        getHumidity() {
            return this.humidity;
        }

        setHumidity(humidity: number) {
            this.humidity = humidity;
        }

        ToString(): string {
            return `Humidity Sensor at ${this.humidity}% humidity`;
        };
    };
}
