import WebUSBDevice from './webUsbDevice'
import Logger from './logger'
import EChipReaderDevice from './echipReaderDevice'
import { TypedEvent, Listener } from './typedEvent'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

export default class EChipReader extends WebUSBDevice {
  private onConnectEvent = new TypedEvent<EChipReaderDevice>()
  private onDisconnectEvent = new TypedEvent<null>()

  constructor () {
    super(ECHIP_READER_VENDOR_ID, ECHIP_READER_PRODUCT_ID)
  }

  onConnect (listener: Listener<EChipReaderDevice>) {
    return this.onConnectEvent.on(listener)
  }

  onDisconnect (listener: Listener<null>) {
    return this.onDisconnectEvent.on(listener)
  }

  protected async connected (device: USBDevice) {
    await super.connected(device)
    Logger.info('EChip Reader connected.')
    if (this.targetDevice) {
      const echipReaderDevice = new EChipReaderDevice(this.targetDevice, (l: Listener<null>) => this.onDisconnect(l))
      await echipReaderDevice.claimed
      this.onConnectEvent.emit(echipReaderDevice)
    }
  }

  protected async disconnected () {
    await super.disconnected()
    Logger.info('EChip Reader disconnected.')
    this.onDisconnectEvent.emit(null)
  }
}
