import { USBDevice } from './usbDevice'
import { EChipReader } from './echipReader'
import { TypedEvent, Listener, Disposable } from './typedEvent'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

export class EChipReaderWatcher extends USBDevice {
  private onConnectEvent = new TypedEvent<EChipReader>()
  private onDisconnectEvent = new TypedEvent<WebUSBDevice>()

  constructor () {
    super(ECHIP_READER_VENDOR_ID, ECHIP_READER_PRODUCT_ID)
  }

  async stop () {
    await Promise.all(this.connectedDevices.map(d => this.disconnected(d)))
  }

  onConnect (listener: Listener<EChipReader>): Disposable {
    return this.onConnectEvent.on(listener)
  }

  private onDisconnect (listener: Listener<WebUSBDevice>) {
    return this.onDisconnectEvent.on(listener)
  }

  protected async connected (device: WebUSBDevice) {
    await super.connected(device)
    const echipReader = new EChipReader(device, (l: Listener<WebUSBDevice>) => this.onDisconnect(l))
    await echipReader.claimed
    this.onConnectEvent.emit(echipReader)
  }

  protected async disconnected (device: WebUSBDevice) {
    await super.disconnected(device)
    this.onDisconnectEvent.emit(device)
  }
}

export default new EChipReaderWatcher()
