import OWDevice from './owDevice';
import EChipConnection from './echipConnection';
import { EChipObject, MachineObject } from './echipLib';
import { Listener, Disposable } from './typedEvent';
export default class EChip extends EChipConnection {
    private echipId;
    private owDevice;
    private data;
    constructor(echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable);
    readonly id: string;
    destroy(): void;
    getData(): Promise<EChipObject>;
    clearData(): Promise<void>;
    setData(machines: {
        [index: string]: MachineObject;
    }): Promise<void>;
    protected dispose(): Promise<void>;
    private loadData;
}
