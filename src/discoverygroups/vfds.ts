import { ShihlinSL3DiscoveryFunction } from "../devices/shihlin-sl3/device";
import { ModbusRTUDiscoveryFunction, ModbusRTUDeduplicationFunction } from "../protocols/modbus-rtu";
import { DeviceFactory } from "../device";

// Do not put add vendor- or device-specific discovery functions
// above the ModbusRTUDiscoveryFunction.
DeviceFactory.addDiscoveryFunction(ModbusRTUDiscoveryFunction);
DeviceFactory.addDeduplicationFunction(ModbusRTUDeduplicationFunction);

DeviceFactory.addDiscoveryFunction(ShihlinSL3DiscoveryFunction);