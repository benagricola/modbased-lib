import { CommunicationProtocolSymbol } from '../communication';
import type { ICommunicationProtocolMixin } from '../communication';

export function isProtocolMixin(value: any): value is ICommunicationProtocolMixin {
    return value && value[CommunicationProtocolSymbol] === true;
}

export function isTimeoutError(error: any): boolean {
    return error.isTimeout ?? false;
}
