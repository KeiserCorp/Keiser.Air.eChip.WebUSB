import EChip from './echip'
import Logger from './logger'
import { TypedEvent, Listener } from './typedEvent'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

export interface ConnectionEvent {
  connected: boolean
}

export default class EChipReader {
  private onConnectChange = new TypedEvent<ConnectionEvent>()
  private targetDevice: EChip | null

  constructor () {
    this.targetDevice = null

    navigator.usb.addEventListener('connect', event => { this.attached(event) })
    navigator.usb.addEventListener('disconnect', event => { this.detached(event) })

    this.checkDevices()
  }

  async connect () {
    if (!this.targetDevice) {
      await this.requestPermission()
    }
  }

  async disconnect () {
    if (this.targetDevice) {
      this.close()
    }
  }

  onConnectionChange (listener: Listener<ConnectionEvent>) {
    this.onConnectChange.on(listener)
  }

  private async requestPermission () {
    try {
      let device = await navigator.usb.requestDevice({
        filters: [{
          vendorId: ECHIP_READER_VENDOR_ID,
          productId: ECHIP_READER_PRODUCT_ID
        }]
      })
      this.open(device)
    } catch (error) {
      Logger.error('EChip Reader permission denied.')
      throw new Error('EChip Reader permission denied.')
    }
  }

  private async checkDevices () {
    let devices = await navigator.usb.getDevices()
    devices.some(device => {
      if (this.matchesTarget(device)) {
        this.open(device)
        return true
      }
      return false
    })
  }

  private attached (event: Event) {
    if (event instanceof USBConnectionEvent && !this.targetDevice && this.matchesTarget(event.device)) {
      this.open(event.device)
    }
  }

  private detached (event: Event) {
    if (event instanceof USBConnectionEvent
      && this.matchesTarget(event.device)
      && this.targetDevice
      && this.targetDevice.isSameDevice(event.device)) {
      this.close()
    }
  }

  private open (device: USBDevice) {
    Logger.info('EChip Reader connected.')
    this.targetDevice = new EChip(device)
    this.onConnectChange.emit({ connected: true })
  }

  private async close () {
    if (this.targetDevice) {
      await this.targetDevice.disconnect()
      this.targetDevice = null
      Logger.info('EChip Reader disconnected.')
      this.onConnectChange.emit({ connected: false })
    }
  }

  private matchesTarget (device: USBDevice) {
    return device.vendorId === ECHIP_READER_VENDOR_ID &&
      device.productId === ECHIP_READER_PRODUCT_ID
  }
}
