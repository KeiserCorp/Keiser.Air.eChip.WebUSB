import OWReader from './owReader';
export default class EChip {
    targetDevice: OWReader | null;
    constructor();
    checkDevices(): Promise<void>;
    requestPermission(): Promise<void>;
    close(): void;
    private attached;
    private detached;
    private connect;
    private matchesTarget;
}
