import { TDevice, DeviceType, DeviceRegisterType, TDeviceRegisterOptions, TDeviceRegisterDefinitions } from '../../device';
import { ICommunication } from '../../communication';
import { IImplementation, IDiscoverOptions } from '../../implementation';
import { ModbusRTUDevice, ModbusRTUReadRegisterRequest, ModbusRTUReadRegisterResponse } from '../rtu';
import { VFD } from '../vfd';

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
const inputTerminalOptions: TDeviceRegisterOptions = {
    0: "Forward Run",
    1: "Reverse Run",
    7: "Emergency Stop",
    28: "Run (Inverter runs forward)",
    29: "Forward / Reverse (use with Run signal, on = reverse)",
    30: "External Reset",
    31: "Stop (3-wire control with Forward / Reverse Run)",
    41: "PWM Set Frequency",
};

const outputTerminalOptions: TDeviceRegisterOptions = {
    0: "Inverter Running",
    1: "Target Frequency Reached",
    2: "Frequency Detection Triggered (On when 03-21 / P.42 or 03-22 / P.43 is reached)",
    3: "Overload",
    4: "Output Current Zero",
    5: "Alarm",
    12: "Overtorque",
    17: "Inverter on, No Alarm",
};

const registerDefinitions: TDeviceRegisterDefinitions = {
    10000: {
        name: "Inverter Model",
        type: DeviceRegisterType.ReadOnly,
        description: "Model number of the inverter",
    },
    10001: {
        name: "Firmware Version",
        type: DeviceRegisterType.ReadOnly,
        description: "Firmware version of the inverter",
        displayFormat(response: number[]): string {
            return `0.${response[0]}`;
        }
    },
    10002: {
        name: "Parameter Restore",
        type: DeviceRegisterType.ReadWrite,
        description: "Restore the inverter parameters to factory defaults",
        options: {
            0: "Off",
            1: "Clear Alarm History (P.996=1)",
            2: "Reset Inverter (P.997=1)",
            3: "Restore all parameters to default (P.998=1)",
            4: "Restore some parameters to default 1 (P.999=1)",
            5: "Restore some parameters to default 2 (P.999=2)",
            6: "Restore some parameters to default 3 (P.999=3)"
        },
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
        options: {
            0: "Idling Brake",
            1: "DC Injection Brake"
        },
        writeFormat: writeInt
    },
    10015: {
        name: "Prevent Rotation Direction Selection",
        type: DeviceRegisterType.ReadWrite,
        description: "Prevent forward / reverse rotation selection",
        options: {
            0: "Allow Forward / Reverse",
            1: "Prevent Reverse",
            2: "Prevent Forward"
        },
        writeFormat: writeInt
    },
    10016: {
        name: "Operation Mode Selection",
        type: DeviceRegisterType.ReadWrite,
        description: "Select the operation mode",
        options: {
            0: "PU / External / Jog selectable by Keypad",
            1: "PU / Jog selectable by Keypad",
            2: "External mode only",
            3: "Communication (RS485) mode only"
        },
        writeFormat: writeInt
    },
    10017: {
        name: "Frequency Reference Selection",
        type: DeviceRegisterType.ReadWrite,
        description: "Select the frequency reference",
        options: {
            0: "Keypad",
            1: "Communication (RS485)",
            2: "External Analog Terminal"
        },
        writeFormat: writeInt
    },
    10019: {
        name: "Communication Mode Selection",
        type: DeviceRegisterType.ReadWrite,
        description: "Select the communication mode",
        options: {
            0: "Frequency and Run Signal given over RS485",
            1: "Frequency and Run Signal given over external terminals"
        },
        writeFormat: writeInt
    },
    10021: {
        name: "Motor Control Mode Selection",
        type: DeviceRegisterType.ReadOnly,
        description: "Select the motor control mode",
        options: {
            0: "Induction Motor V/F Control"
        }
    },
    10025: {
        name: "Parameter Display Mode Selection",
        type: DeviceRegisterType.ReadWrite,
        description: "Select the parameter display mode",
        options: {
            0: "Group Mode (nn-nn)",
            1: "Parameter Mode (P.nnn)"
        },
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
        options: {
            0: "Linear",
            1: "S-Curve 1",
            2: "S-Curve 2",
            3: "S-Curve 3"
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
        options: {
            0: "0.01s",
            1: "0.1s"
        },
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
        options: {
            0: "Constant Torque",
            1: "Variable Torque",
            2: "Lifting 1",
            3: "Lifting 2"
        }
    },
    10220: {
        name: "Analog Input Signal Range Selection",
        type: DeviceRegisterType.ReadWrite,
        description: "Select the analog input signal range",
        options: {
            0: "4-20mA",
            1: "0-10V",
            2: "0-5V"
        }
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
        options: {
            0: "All Terminals Positive Logic",
            15: "All Terminals Negative Logic (CAUTION)"
        }
    },
    10315: {
        name: "Digital Output Logic",
        type: DeviceRegisterType.ReadWrite,
        description: "Set the logic of the digital outputs",
        options: {
            0: "Output Terminal Positive Logic",
            2: "Output Terminal Negative Logic"
        }
    }
};

export class ShihlinVFD extends VFD {
    static TypeName = "Shihlin VFD";
    deviceType: DeviceType = DeviceType.Shihlin;
    manufacturer = "Shihlin";
    model = "SL3";

    voltage: number = 0;
    phases: number = 0;
    power: number = 0;

    registerDefinitions: TDeviceRegisterDefinitions = registerDefinitions;

    constructor(device?: TDevice, impl?: IImplementation) {
        super(device, impl);
        if(device) {
            this.protocolType = device.protocolType;
        }
    }

    static async discoverFunction(comm: ICommunication, discoverOpts: IDiscoverOptions): Promise<TDevice[]> {
        const devices: ShihlinVFD[] = [];
        // Discover devices using a normal RTU echo test
        const modbusRTUDevices = await ModbusRTUDevice.discoverFunction(comm, discoverOpts)
        for (const device of modbusRTUDevices as ModbusRTUDevice[]) {
            // Run discovery using the Shihlin-specific model number register, 10000
            try {
                const res = await comm.Request(new ModbusRTUReadRegisterRequest(
                    device.address,
                    10000,
                    1,
                )) as ModbusRTUReadRegisterResponse;
                if(!res.isValid()) {
                    comm.Debug(`Invalid response from device at address ${device.address}: ${res.validationError}`);
                    continue;
                }
                const model = decodeInverterModel(res.registerValues[0]);
                const newDevice = new ShihlinVFD(device);
                newDevice.protocolType = device.protocolType;
                newDevice.discoveryStatus = "Shihlin Inverter Model Number Read";
                newDevice.voltage = model.voltage;
                newDevice.phases = model.phases;
                newDevice.power = model.power;
                devices.push(newDevice);
            } catch (error: any) {
                comm.Error(`Error during discovery: ${error}`);
            }

        }

        return devices;
    }

    ToString(): string {
        return `${this.manufacturer} ${this.model} (${this.voltage} / ${this.power}) at address ${this.address}`;
    }
}

