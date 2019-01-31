import WebUSBDevice from './webUsbDevice';
import EChipReader from './EChipReader';
import { Listener } from './typedEvent';
export default class EChipReaderWatcher extends WebUSBDevice {
    private onConnectEvent;
    private onDisconnectEvent;
    constructor();
    stop(): void;
    onConnect(listener: Listener<EChipReader>): import("./typedEvent").Disposable;
    private onDisconnect;
    protected connected(device: USBDevice): Promise<void>;
    protected disconnected(device: USBDevice): Promise<void>;
}
