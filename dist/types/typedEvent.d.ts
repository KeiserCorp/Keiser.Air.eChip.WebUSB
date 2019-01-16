export interface Listener<T> {
    (event: T): any;
}
export interface Disposable {
    dispose(): void;
}
export declare class TypedEvent<T> {
    private listeners;
    on(listener: Listener<T>): Disposable;
    private off;
    emit(event: T): void;
}
