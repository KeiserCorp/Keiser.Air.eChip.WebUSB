export default class OWReader {
    coreDevice: USBDevice;
    constructor(device: USBDevice);
    /*****************************************
    *  Exposed Controls
    *****************************************/
    isSameDevice(device: USBDevice): boolean;
    disconnect(): Promise<void>;
    /*****************************************
    *  Control Flow
    *****************************************/
    initialize(): Promise<void>;
    /*****************************************
    *  Interface and Endpoints
    *****************************************/
    mapEndpoints(): Promise<void>;
}
