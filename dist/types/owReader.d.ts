export default class OWReader {
    coreDevice: USBDevice;
    constructor(device: USBDevice);
    isSameDevice(device: USBDevice): boolean;
    disconnect(): Promise<void>;
    initialize(): Promise<void>;
    mapEndpoints(): Promise<void>;
}
