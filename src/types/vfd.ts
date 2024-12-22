import { DeviceType } from '../device';

export function VFDDeviceType<TBase extends new (...args: any[]) => {}>(Base: TBase) {
    return class extends Base {
        type = DeviceType.VFD;

        private voltage: number = 0;
        private phases: number = 0;
        private power: number = 0;

        getVoltage() {
        return this.voltage;
        }
        getPhases() {
            return this.phases;
        }
        getPower() {
            return this.power;
        }

        setVfdProperties(voltage: number, phases: number, power: number) {
            this.voltage = voltage;
            this.phases = phases;
            this.power = power;
        }

        getStatus(): string[] {
            return [`Voltage: ${this.voltage}v`, `Phases: ${this.phases}ph`, `Power: ${this.power}kW`];
        };
    };
}
