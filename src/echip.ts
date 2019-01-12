import OWReader from './owReader'
import Logger from './logger'
import { TypedEvent, Listener } from './typedEvent'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

export interface ConnectionEvent {
  connected: boolean
}

export default class EChip {
  private onConnectChange = new TypedEvent<ConnectionEvent>()
  private targetDevice: OWReader | null

  constructor () {
    this.targetDevice = null

    navigator.usb.addEventListener('connect', event => { this.attached(event) })
    navigator.usb.addEventListener('disconnect', event => { this.detached(event) })

    this.checkDevices()
  }

  async open () {
    await this.requestPermission()
  }

  async close () {
    if (this.targetDevice) {
      await this.targetDevice.disconnect()
      this.targetDevice = null
      this.onConnectChange.emit({ connected: false })
    }
  }

  onConnectionChange (listener: Listener<ConnectionEvent>) {
    this.onConnectChange.on(listener)
  }

  private async requestPermission () {
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
        Logger.error('EChip Reader permission denied.')
        throw new Error('EChip Reader permission denied.')
      }
    }
  }

  private async checkDevices () {
    let devices = await navigator.usb.getDevices()
    devices.some(device => {
      if (this.matchesTarget(device)) {
        Logger.info('EChip Reader already connected.')
        this.connect(device)
        return true
      }
      return false
    })
  }

  private attached (event: Event) {
    if (event instanceof USBConnectionEvent && !this.targetDevice && this.matchesTarget(event.device)) {
      Logger.info('EChip Reader connected.')
      this.connect(event.device)
    }
  }

  private detached (event: Event) {
    if (event instanceof USBConnectionEvent
      && this.matchesTarget(event.device)
      && this.targetDevice
      && this.targetDevice.isSameDevice(event.device)) {
      Logger.info('EChip Reader disconnected.')
      this.close()
    }
  }

  private connect (device: USBDevice) {
    this.targetDevice = new OWReader(device)
    this.onConnectChange.emit({ connected: true })
  }

  private matchesTarget (device: USBDevice) {
    return device.vendorId === ECHIP_READER_VENDOR_ID &&
      device.productId === ECHIP_READER_PRODUCT_ID
  }
}
