import OWReader from './owReader'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

export default class EChip {
  targetDevice: OWReader | null

  constructor () {
    this.targetDevice = null

    navigator.usb.addEventListener('connect', event => { this.attached(event) })
    navigator.usb.addEventListener('disconnect', event => { this.detached(event) })

    this.checkDevices()
  }

  async checkDevices () {
    let devices = await navigator.usb.getDevices()
    devices.forEach(device => {
      if (this.matchesTarget(device)) {
        console.log('EChip Reader already connected.')
        this.connect(device)
      }
    })
  }

  async requestPermission () {
    if (!this.targetDevice) {
      try {
        let device = await navigator.usb.requestDevice({
          filters: [{
            vendorId: ECHIP_READER_VENDOR_ID,
            productId: ECHIP_READER_PRODUCT_ID
          }]
        })
        this.connect(device)
      } catch (error) {
        throw new Error('EChip Reader permission denied.')
      }
    }
  }

  close () {
    if (this.targetDevice) {
      this.targetDevice.disconnect()
      this.targetDevice = null
    }
  }

  private attached (event: Event) {
    if (event instanceof USBConnectionEvent && this.matchesTarget(event.device)) {
      console.log('EChip Reader connected.')
      this.connect(event.device)
    }
  }

  private detached (event: Event) {
    if (event instanceof USBConnectionEvent
      && this.matchesTarget(event.device)
      && this.targetDevice
      && this.targetDevice.isSameDevice(event.device)) {
      console.log('EChip Reader disconnected.')
      this.close()
    }
  }

  private connect (device: USBDevice) {
    this.targetDevice = new OWReader(device)
  }

  private matchesTarget (device: USBDevice) {
    return device.vendorId === ECHIP_READER_VENDOR_ID &&
      device.productId === ECHIP_READER_PRODUCT_ID
  }
}
