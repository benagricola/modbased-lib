import { DeviceGroup, IDeviceType } from '../device';

export function VFDDeviceType<TBase extends new (...args: any[]) => {}>(Base: TBase) {
    return class extends Base {
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

        ToString(): string {
            return `VFD at voltage ${this.voltage}, ${this.phases} phases, and ${this.power} power`;
        };
    };
}
