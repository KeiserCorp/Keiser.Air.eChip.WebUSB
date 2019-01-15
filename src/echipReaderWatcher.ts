import WebUSBDevice from './webUsbDevice'
import EChipReader from './EChipReader'
import { TypedEvent, Listener } from './typedEvent'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

export default class EChipReaderWatcher extends WebUSBDevice {
  private onConnectEvent = new TypedEvent<EChipReader>()
  private onDisconnectEvent = new TypedEvent<null>()

  constructor () {
    super(ECHIP_READER_VENDOR_ID, ECHIP_READER_PRODUCT_ID)
  }

  onConnect (listener: Listener<EChipReader>) {
    return this.onConnectEvent.on(listener)
  }

  private onDisconnect (listener: Listener<null>) {
    return this.onDisconnectEvent.on(listener)
  }

  protected async connected (device: USBDevice) {
    await super.connected(device)
    if (this.targetDevice) {
      const echipReader = new EChipReader(this.targetDevice, (l: Listener<null>) => this.onDisconnect(l))
      await echipReader.claimed
      this.onConnectEvent.emit(echipReader)
    }
  }

  protected async disconnected () {
    this.onDisconnectEvent.emit(null)
    await super.disconnected()
  }
}
