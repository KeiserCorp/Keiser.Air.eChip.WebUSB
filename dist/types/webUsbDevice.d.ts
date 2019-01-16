export default class WebUSBDevice {
    private vendorId;
    private productId;
    protected targetDevice: USBDevice | null;
    constructor(vendorId: number, productId: number);
    readonly isConnected: boolean;
    start(): Promise<void>;
    private requestPermission;
    private checkDevices;
    private attached;
    private detached;
    protected connected(device: USBDevice): Promise<void>;
    protected disconnected(): Promise<void>;
    private matchesTarget;
    private isTargetDevice;
}
