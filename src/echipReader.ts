import WebUSBDevice from './webUsbDevice'
import Logger from './logger'
import EChipReaderDevice from './echipReaderDevice'
import { TypedEvent, Listener } from './typedEvent'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

interface ConnectionEvent {
  connected: boolean,
  echipReaderDevice: EChipReaderDevice | null
}

export default class EChipReader extends WebUSBDevice {
  private onConnectChange = new TypedEvent<ConnectionEvent>()

  constructor () {
    super(ECHIP_READER_VENDOR_ID, ECHIP_READER_PRODUCT_ID)
  }

  onConnectionChange (listener: Listener<ConnectionEvent>) {
    this.onConnectChange.on(listener)
  }

  protected async connected (device: USBDevice) {
    await super.connected(device)
    Logger.info('EChip Reader connected.')
    if (this.targetDevice) {
      const echipReaderDevice = new EChipReaderDevice(this.targetDevice)
      await echipReaderDevice.claimed
      this.onConnectChange.emit({ connected: true, echipReaderDevice })
    }
  }

  protected async disconnected () {
    await super.disconnected()
    Logger.info('EChip Reader disconnected.')
    this.onConnectChange.emit({ connected: false, echipReaderDevice: null })
  }
}
