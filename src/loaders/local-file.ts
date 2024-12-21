import type { IDefinitionLoader } from "../definition";
import type { TDeviceRegisterDefinitions } from "../device";

export class LocalFileDefinitionLoader implements IDefinitionLoader {
    loaded: boolean = false;
    constructor() {
        // Ensure the class is marked as a definition loader.
    }

    async load(): Promise<void> {
        console.log("Loading definitions from a local file");
        // Load definitions from a local file based on the device details
        // and set the register and coil definitions.
    }

    getRegisterDefinitions(): TDeviceRegisterDefinitions {
        if(this.loaded) {
            return {};
        }

        return {};
    }
}
