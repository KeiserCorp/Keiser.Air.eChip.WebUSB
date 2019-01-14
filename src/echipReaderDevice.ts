// import Logger from './logger'
import OWDevice from './owDevice'

export default class EChipReaderDevice {
  claimed: Promise<boolean>
  private usbDevice: USBDevice
  private owDevice: OWDevice

  constructor (usbDevice: USBDevice) {
    this.usbDevice = usbDevice
    this.owDevice = new OWDevice(this.usbDevice)
    this.claimed = this.owDevice.claim()
  }

}
