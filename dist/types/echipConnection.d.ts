import { Listener, Disposable } from './typedEvent';
export default class EChipConnection {
    protected disposed: boolean;
    private onDisconnectListener;
    private onDisconnectEvent;
    constructor(onDisconnect: (listener: Listener<null>) => Disposable);
    readonly diposed: boolean;
    onDisconnect(listener: Listener<null>): Disposable;
    protected disconnected(): void;
    protected dispose(): void;
}
