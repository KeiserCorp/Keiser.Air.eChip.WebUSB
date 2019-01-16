import { Listener, Disposable } from './typedEvent';
export default class EChipConnection {
    protected disposed: boolean;
    private onDisconnectListener;
    constructor(onDisconnect: (listener: Listener<null>) => Disposable);
    readonly diposed: boolean;
    protected disconnected(): void;
    protected dispose(): void;
}
