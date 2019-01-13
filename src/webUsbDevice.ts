import { TypedEvent, Listener } from './typedEvent'
import Logger from './logger'

interface ConnectionEvent {
  connected: boolean
}

export default class WebUSBDevice {
  private vendorId: number
  private productId: number
  private targetDevice: USBDevice | null = null
  private onConnectChange = new TypedEvent<ConnectionEvent>()

  constructor (vendorId: number, productId: number) {
    this.vendorId = vendorId
    this.productId = productId

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
    this.disconnected()
  }

  onConnectionChange (listener: Listener<ConnectionEvent>) {
    this.onConnectChange.on(listener)
  }

  private async requestPermission () {
    try {
      let device = await navigator.usb.requestDevice({
        filters: [{
          vendorId: this.vendorId,
          productId: this.productId
        }]
      })
      this.connected(device)
    } catch (error) {
      Logger.error('USB Device permission denied.')
      throw new Error('USB Device permission denied.')
    }
  }

  private async checkDevices () {
    let devices = await navigator.usb.getDevices()
    devices.some(device => {
      if (this.matchesTarget(device)) {
        this.connected(device)
        return true
      }
      return false
    })
  }

  private attached (event: Event) {
    if (event instanceof USBConnectionEvent
      && !this.targetDevice
      && this.matchesTarget(event.device)) {
      this.connected(event.device)
    }
  }

  private detached (event: Event) {
    if (event instanceof USBConnectionEvent
      && this.matchesTarget(event.device)
      && this.targetDevice
      && this.isTargetDevice(event.device)) {
      this.disconnected()
    }
  }

  private connected (device: USBDevice) {
    this.targetDevice = device
    Logger.info('USB Device connected.')
    this.onConnectChange.emit({ connected: true })
  }

  private async disconnected () {
    if (this.targetDevice) {
      this.targetDevice.close()
    }
    this.targetDevice = null
    Logger.info('USB Device disconnected.')
    this.onConnectChange.emit({ connected: false })
  }

  private matchesTarget (device: USBDevice) {
    return device.vendorId === this.vendorId &&
      device.productId === this.productId
  }

  private isTargetDevice (device: USBDevice) {
    return this.targetDevice && this.targetDevice.serialNumber === device.serialNumber
  }
}