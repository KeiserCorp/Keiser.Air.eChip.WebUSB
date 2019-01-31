import EChip from './echip';
import { Listener, Disposable } from './typedEvent';
export default class EChipReader {
    readonly claimed: Promise<boolean>;
    private disposed;
    private onDisconnectListener;
    private usbDevice;
    private owDevice;
    private onEChipDetectEvent;
    private onDisconnectEvent;
    private activeKeys;
    constructor(usbDevice: USBDevice, onDisconnect: (listener: Listener<USBDevice>) => Disposable);
    readonly diposed: boolean;
    onDisconnect(listener: Listener<null>): Disposable;
    onEChipDetect(listener: Listener<EChip>): void;
    private echipsDetected;
    protected disconnected(device: USBDevice): void;
    protected dispose(): Promise<void>;
}
