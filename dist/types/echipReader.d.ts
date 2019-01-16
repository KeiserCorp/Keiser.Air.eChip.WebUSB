import EChip from './echip';
import EChipConnection from './echipConnection';
import { Listener, Disposable } from './typedEvent';
export default class EChipReader extends EChipConnection {
    readonly claimed: Promise<boolean>;
    private owDevice;
    private onEChipDetectEvent;
    private onDisconnectEvent;
    private activeKeys;
    constructor(usbDevice: USBDevice, onDisconnect: (listener: Listener<null>) => Disposable);
    onDisconnect(listener: Listener<null>): Disposable;
    onEChipDetect(listener: Listener<EChip>): void;
    private echipsDetected;
    protected disconnected(): void;
    protected dispose(): Promise<void>;
}
