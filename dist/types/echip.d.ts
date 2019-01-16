import OWDevice from './owDevice';
import EChipConnection from './echipConnection';
import { Listener, Disposable } from './typedEvent';
export default class EChip extends EChipConnection {
    private echipId;
    private owDevice;
    constructor(echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable);
    readonly id: string;
    destroy(): void;
    placeholder(): void;
    protected dispose(): Promise<void>;
}
