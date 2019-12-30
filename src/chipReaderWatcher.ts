import { USBDevice } from './usbDevice'
import { ChipReader } from './chipReader'
import { TypedEvent, Listener, Disposable } from './typedEvent'
import { WebUSBDevice } from '../types/w3c-web-usb'

const CHIP_READER_VENDOR_ID = 0x04FA
const CHIP_READER_PRODUCT_ID = 0x2490

export class ChipReaderWatcher extends USBDevice {
  private onConnectEvent = new TypedEvent<ChipReader>()
  private onDisconnectEvent = new TypedEvent<WebUSBDevice>()
  private connectedChipReaders: Array<ChipReader> = []

  constructor () {
    super(CHIP_READER_VENDOR_ID, CHIP_READER_PRODUCT_ID)
  }

  async stop () {
    await Promise.all(this.connectedDevices.map(d => this.disconnected(d)))
  }

  get isConnected () {
    return this.connectedChipReaders.length > 0
  }

  getConnectedChipReaders () {
    return this.connectedChipReaders.slice(0)
  }

  onConnect (listener: Listener<ChipReader>): Disposable {
    return this.onConnectEvent.on(listener)
  }

  private onDisconnect (listener: Listener<WebUSBDevice>) {
    return this.onDisconnectEvent.on(listener)
  }

  protected async connected (device: WebUSBDevice) {
    await super.connected(device)
    const chipReader = new ChipReader(device, (l: Listener<WebUSBDevice>) => this.onDisconnect(l))
    await chipReader.claimed
    this.connectedChipReaders.push(chipReader)
    this.onConnectEvent.emit(chipReader)
  }

  protected async disconnected (device: WebUSBDevice) {
    await super.disconnected(device)
    this.onDisconnectEvent.emit(device)
  }
}

export default new ChipReaderWatcher()
