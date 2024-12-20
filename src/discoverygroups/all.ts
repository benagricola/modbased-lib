import { ShihlinSL3DiscoveryFunction } from "../devices/shihlin-sl3/device";
import { SHT20DiscoveryFunction } from "../devices/sht20/device";
import { ModbusRTUDeduplicationFunction, ModbusRTUDiscoveryFunction } from "../protocols/modbus-rtu";
import { DeviceFactory } from "../device";

// Do not put add vendor- or device-specific discovery functions
// above the ModbusRTUDiscoveryFunction.
DeviceFactory.addDiscoveryFunction(ModbusRTUDiscoveryFunction);
DeviceFactory.addDeduplicationFunction(ModbusRTUDeduplicationFunction);

DeviceFactory.addDiscoveryFunction(ShihlinSL3DiscoveryFunction);
DeviceFactory.addDiscoveryFunction(SHT20DiscoveryFunction);
