/// <reference types="w3c-web-usb" />
import WebUSBDevice from './webUsbDevice'
import EChipReader from './echipReader'
import { TypedEvent, Listener } from './typedEvent'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

export default class EChipReaderWatcher extends WebUSBDevice {
  private onConnectEvent = new TypedEvent<EChipReader>()
  private onDisconnectEvent = new TypedEvent<USBDevice>()

  constructor () {
    super(ECHIP_READER_VENDOR_ID, ECHIP_READER_PRODUCT_ID)
  }

  stop () {
    this.connectedDevices.forEach(d => this.disconnected(d))
  }

  onConnect (listener: Listener<EChipReader>) {
    return this.onConnectEvent.on(listener)
  }

  private onDisconnect (listener: Listener<USBDevice>) {
    return this.onDisconnectEvent.on(listener)
  }

  protected async connected (device: USBDevice) {
    await super.connected(device)
    const echipReader = new EChipReader(device, (l: Listener<USBDevice>) => this.onDisconnect(l))
    await echipReader.claimed
    this.onConnectEvent.emit(echipReader)
  }

  protected async disconnected (device: USBDevice) {
    await super.disconnected(device)
    this.onDisconnectEvent.emit(device)
  }
}
