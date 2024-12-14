import { ModbusDevice, ModbusDeviceType, DiscoveryCommand, DeviceRegisters, DeviceRegisterType, DeviceRegisterOptions } from '../../Device';
import { VFD } from './Generic-RTU';

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

const decodeInverterModel = (response: number[]): ShihlinInverterModel => {
    const vphases = Math.floor(response[2] / 16);
    return {
        voltage: inverterModelVoltage[vphases] || 0,
        phases: inverterModelPhases[vphases] || 0,
        power: inverterModelPower[response[3] & 0x0F] || 0
    } as ShihlinInverterModel;
}

const displayHz = (response: number[]): string => {
    return `${response[0]}Hz`;
}

const displayKHz = (response: number[]): string => {
    return `${response[0]}kHz`;
}

const displayV = (response: number[]): string => {
    return `${response[0]}V`;
}

const writeInt = (value: string): number[] => {
    // Write a single integer value into a 16-bit register
    return [parseInt(value)];
}

const inputTerminalOptions: DeviceRegisterOptions = [
    { value: "0", text: "Forward Run" },
    { value: "1", text: "Reverse Run" },
    { value: "7", text: "Emergency Stop" },
    { value: "28", text: "Run (Inverter runs forward)" },
    { value: "29", text: "Forward / Reverse (use with Run signal, on = reverse)" },
    { value: "30", text: "External Reset" },
    { value: "31", text: "Stop (3-wire control with Forward / Reverse Run)" },
    { value: "41", text: "PWM Set Frequency" },
];

const outputTerminalOptions: DeviceRegisterOptions = [
    { value: "0", text: "Inverter Running" },
    { value: "1", text: "Target Frequency Reached" },
    { value: "2", text: "Frequency Detection Triggered (On when 03-21 / P.42 or 03-22 / P.43 is reached)" },
    { value: "3", text: "Overload" },
    { value: "4", text: "Output Current Zero" },
    { value: "5", text: "Alarm" },
    { value: "12", text: "Overtorque" },
    { value: "17", text: "Inverter on, No Alarm" },
];

// Implement Shihlin VFD device. These VFD's are modbus-rtu compatible
// and defining a subclass allows us to use a more-specific discovery
// mechanism that can decode the responses in a meaningful way.
export class ShihlinVFD extends VFD {
    static TypeName = "Shihlin VFD";
    deviceType: ModbusDeviceType = ModbusDeviceType.Shihlin;
    manufacturer = "Shihlin";
    model = "SL3";

    voltage: number = 0;
    phases: number = 0;
    power: number = 0;

    registers: DeviceRegisters = {
        10000: {
            name: "Inverter Model",
            type: DeviceRegisterType.ReadOnly,
            description: "Model number of the inverter",
            displayFormat(response: number[]): string {
                const model = decodeInverterModel(response);
                return `${model.voltage}V ${model.phases}ph ${model.power}kW`;
            }
        },
        10001: {
            name: "Firmware Version",
            type: DeviceRegisterType.ReadOnly,
            description: "Firmware version of the inverter",
            displayFormat(response: number[]): string {
                // Firmware version is 0.<response-as-decimal>
                return `0.${response[0]}`;
            }
        },
        10002: {
            name: "Parameter Restore",
            type: DeviceRegisterType.ReadWrite,
            description: "Restore the inverter parameters to factory defaults",
            options: [
                { value: "0", text: "Off" },
                { value: "1", text: "Clear Alarm History (P.996=1)" },
                { value: "2", text: "Reset Inverter (P.997=1)" },
                { value: "3", text: "Restore all parameters to default (P.998=1)" },
                { value: "4", text: "Restore some parameters to default 1 (P.999=1)" },
                { value: "5", text: "Restore some parameters to default 2 (P.999=2)" },
                { value: "6", text: "Restore some parameters to default 3 (P.999=3)" }
            ],
            writeFormat: writeInt
        },
        10011: {
            name: "Carrier Frequency",
            type: DeviceRegisterType.ReadWrite,
            description: "Carrier frequency in kHz",
            displayFormat: displayKHz,
            writeFormat: writeInt
        },
        10013: {
            name: "Braking Function",
            type: DeviceRegisterType.ReadWrite,
            description: "Behaviour of the braking function",
            options: [
                { value: "0", text: "Idling Brake" },
                { value: "1", text: "DC Injection Brake" },
            ],
            displayFormat(response: number[]): string {
                return response[0] === 0 ? "Idling Brake" : "DC Injection Brake";
            },
            writeFormat: writeInt
        },
        10015: {
            name: "Prevent Rotation Direction Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Prevent forward / reverse rotation selection",
            options: [
                { value: "0", text: "Allow Forward / Reverse" },
                { value: "1", text: "Prevent Reverse" },
                { value: "2", text: "Prevent Forward" },
            ],
            displayFormat(response: number[]): string {
                return ["Allow Forward / Reverse", "Prevent Reverse", "Prevent Forward"][response[0]];
            },
            writeFormat: writeInt
        },
        10016: {
            name: "Operation Mode Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the operation mode",
            options: [
                { value: "0", text: "PU / External / Jog selectable by Keypad" },
                { value: "1", text: "PU / Jog selectable by Keypad" },
                { value: "2", text: "External mode only" },
                { value: "3", text: "Communication (RS485) mode only" },
            ],
            displayFormat(response: number[]): string {
                return ["PU / External / Jog", "PU / Jog", "External", "Communication"][response[0]];
            },
            writeFormat: writeInt
        },
        10017: {
            name: "Frequency Reference Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the frequency reference",
            options: [
                { value: "0", text: "Keypad" },
                { value: "1", text: "Communication (RS485)" },
                { value: "2", text: "External Analog Terminal" },
            ],
            displayFormat(response: number[]): string {
                return ["Keypad", "Communication", "External Analog"][response[0]];
            },
            writeFormat: writeInt
        },
        10019: {
            name: "Communication Mode Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the communication mode",
            options: [
                { value: "0", text: "Frequency and Run Signal given over RS485" },
                { value: "1", text: "Frequency and Run Signal given over external terminals" },
            ],
            writeFormat: writeInt
        },
        10021: {
            name: "Motor Control Mode Selection",
            type: DeviceRegisterType.ReadOnly, // There is only one valid option
            description: "Select the motor control mode",
            options: [
                { value: "0", text: "Induction Motor V/F Control" },
            ],
        },
        10025: {
            name: "Parameter Display Mode Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the parameter display mode",
            options: [
                { value: "0", text: "Group Mode (nn-nn)" },
                { value: "1", text: "Parameter Mode (P.nnn)" },
            ],
            writeFormat: writeInt
        },
        10100: {
            name: "Maximum Frequency",
            type: DeviceRegisterType.ReadWrite,
            description: "Maximum output frequency in Hz",
            displayFormat: displayHz,
            writeFormat: writeInt
        },
        10101: {
            name: "Minimum Frequency",
            type: DeviceRegisterType.ReadWrite,
            description: "Minimum output frequency in Hz",
            displayFormat: displayHz,
            writeFormat: writeInt
        },
        10102: {
            name: "High-Speed Maximum Frequency",
            type: DeviceRegisterType.ReadWrite,
            description: "Maximum high-speed output frequency in Hz",
            displayFormat: displayHz,
            writeFormat: writeInt
        },
        10103: {
            name: "Base Frequency",
            type: DeviceRegisterType.ReadWrite,
            description: "Base frequency in Hz",
            displayFormat: displayHz,
            writeFormat: writeInt
        },
        10104: {
            name: "Base Voltage",
            type: DeviceRegisterType.ReadWrite,
            description: "Base voltage in V",
            writeFormat: writeInt,
            displayFormat: displayV
        },
        10105: {
            name: "Acceleration Curve Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the acceleration / deceleration curve",
            options: [
                { value: "0", text: "Linear" },
                { value: "1", text: "S-Curve 1" },
                { value: "2", text: "S-Curve 2" },
                { value: "3", text: "S-Curve 3" },
            ],
            displayFormat(response: number[]): string {
                return ["Linear", "S-Curve 1", "S-Curve 2", "S-Curve 3"][response[0]];
            },
            writeFormat: writeInt
        },
        10106: {
            name: "Acceleration Time",
            type: DeviceRegisterType.ReadWrite,
            description: "Acceleration time",
            writeFormat: writeInt
        },
        10107: {
            name: "Deceleration Time",
            type: DeviceRegisterType.ReadWrite,
            description: "Deceleration time",
            writeFormat: writeInt
        },
        10108: {
            name: "Acceleration / Deceleration Time Increment",
            type: DeviceRegisterType.ReadWrite,
            description: "Acceleration / Deceleration time increment",
            options: [
                { value: "0", text: "0.01s" },
                { value: "1", text: "0.1s" },
            ],
            writeFormat: writeInt
        },
        10109: {
            name: "Acceleration / Deceleration Reference Frequency",
            type: DeviceRegisterType.ReadWrite,
            description: "Acceleration / Deceleration from this speed will take the time set in Acc/Dec Time registers",
            displayFormat: displayHz,
            writeFormat: writeInt
        },
        10111: {
            name: "Starting Frequency",
            type: DeviceRegisterType.ReadWrite,
            description: "Starting frequency in Hz",
            displayFormat: displayHz,
            writeFormat: writeInt
        },
        10112: {
            name: "Load Pattern Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the load pattern",
            options: [
                { value: "0", text: "Constant Torque" },
                { value: "1", text: "Variable Torque" },
                { value: "2", text: "Lifting 1" },
                { value: "3", text: "Lifting 2" },
            ],
        },
        10220: {
            name: "Analog Input Signal Range Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the analog input signal range",
            options: [
                { value: "0", text: "4-20mA" },
                { value: "1", text: "0-10V" },
                { value: "2", text: "0-5V" },
            ],
        },
        10221: {
            name: "Maximum Operation Frequency (Jog dial / Analog Input)",
            type: DeviceRegisterType.ReadWrite,
            description: "Maximum operation frequency in Hz when using the jog dial or analog input",
            displayFormat: displayHz,
            writeFormat: writeInt
        },
        10300: {
            name: "Terminal STF Input Function Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the function of the STF external terminal",
            options: inputTerminalOptions
        },
        10301: {
            name: "Terminal STR Input Function Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the function of the STR external terminal",
            options: inputTerminalOptions
        },
        10303: {
            name: "Terminal M0 Input Function Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the function of the M0 external terminal",
            options: inputTerminalOptions
        },
        10304: {
            name: "Terminal M1 Input Function Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the function of the M1 external terminal",
            options: inputTerminalOptions
        },
        10311: {
            name: "Terminal A-C Output Function Selection",
            type: DeviceRegisterType.ReadWrite,
            description: "Select the function of the A-C output terminal",
            options: outputTerminalOptions
        },
        10314: {
            name: "Digital Input Logic",
            type: DeviceRegisterType.ReadWrite,
            description: "Set the logic of the digital inputs",
            options: [
                { value: "0", text: "All Terminals Positive Logic" },
                { value: "15", text: "All Terminals Negative Logic (CAUTION)" },
            ],
        },
        10315: {
            name: "Digital Output Logic",
            type: DeviceRegisterType.ReadWrite,
            description: "Set the logic of the digital outputs",
            options: [
                { value: "0", text: "Output Terminal Positive Logic" },
                { value: "2", text: "Output Terminal Negative Logic" },
            ],
        },
    };

    ToString(): string {
        return `${this.manufacturer} ${this.model} (${this.voltage} / ${this.power}) on port ${this.port},  address ${this.address}`;
    }

    static get discoveryCommand(): DiscoveryCommand {
        return {
            rrfCode: "M260.4",
            discoveryData: [0x03,0x27,0x10,0x00,0x01], // Read inverter model at address 10000
            expectBytes: 4,
            // This command returns the inverter model number in hex.
            // We convert the hex to base 10. First digit is input
            // voltage (1=1ph 220v, 2=3ph 440v), remaining digits are power rating.
            // 02 = 0.4kW, 03 = 0.75kW, 04 = 1.5kW, 05 = 2.2kW
            processResponse(response: number[], device: ModbusDevice) {
                const vfd = device as ShihlinVFD;
                const model = decodeInverterModel(response);
                vfd.power = model.power;
                vfd.voltage = model.voltage;
                vfd.phases = model.phases;
                vfd.discoveryStatus = "Complete";
            }
        };
    }
}

export function isShihlin(device: ModbusDevice): device is ShihlinVFD {
    return device.deviceType === ModbusDeviceType.Shihlin;
}
