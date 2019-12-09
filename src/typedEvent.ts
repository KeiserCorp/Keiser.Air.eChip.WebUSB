import { WebUSBDevice, USBConnectionEventInit } from '../types/w3c-web-usb'

export interface Listener<T> {
  (event: T): any
}

export interface Disposable {
  dispose (): void
}

export class TypedEvent<T> {
  private listeners: Listener<T>[] = []

  on (listener: Listener<T>): Disposable {
    this.listeners.push(listener)
    return { dispose: () => this.off(listener) }
  }

  private off (listener: Listener<T>) {
    let callbackIndex = this.listeners.indexOf(listener)
    if (callbackIndex > -1) {
      this.listeners.splice(callbackIndex, 1)
    }
  }

  emit (event: T) {
    this.listeners.forEach(listener => listener(event))
  }
}

export class WebUSBConnectionEvent extends Event {
  readonly device: WebUSBDevice

  constructor (type: string, eventInitDict: USBConnectionEventInit) {
    super(type)
    this.device = eventInitDict.device
  }
}
