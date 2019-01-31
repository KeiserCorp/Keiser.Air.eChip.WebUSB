export default class WebUSBDevice {
    private readonly vendorId;
    private readonly productId;
    protected connectedDevices: Array<USBDevice>;
    constructor(vendorId: number, productId: number);
    readonly isConnected: boolean;
    start(): Promise<void>;
    private requestPermission;
    private checkDevices;
    private attached;
    private detached;
    protected connected(device: USBDevice): Promise<void>;
    protected disconnected(device: USBDevice): Promise<void>;
    private matchesTarget;
    private isConnectedDevices;
}
