import { nodeToWeb } from './transform'
import { WebUSBDevice, USBConnectionEvent } from '../types/w3c-web-usb'

export class USBDevice {
  private readonly vendorId: number
  private readonly productId: number
  private initialized: boolean = false
  protected connectedDevices: Array<WebUSBDevice> = []
  private supported: boolean = false

  constructor (vendorId: number, productId: number) {
    this.vendorId = vendorId
    this.productId = productId
  }

  protected initialize () {
    if (!this.initialized) {
      if (typeof navigator.usb === 'undefined') {
        if (typeof window.node_usb === 'undefined') {
          this.notSupported()
        }
      } else {
        this.supported = true
        navigator.usb.addEventListener('connect', event => { void this.attached(event as USBConnectionEvent) })
        navigator.usb.addEventListener('disconnect', event => { void this.detached(event as USBConnectionEvent) })
        void this.checkDevices()
      }

      this.initialized = true
    }
  }

  protected notSupported () {
    console.log('Web-USB not supported in this browser')
  }

  get browserSupported () {
    return this.supported
  }

  async start () {
    await this.requestPermission()
  }

  private async requestPermission () {
    if (await this.checkNodeDevices()) {
      return
    }

    if (typeof navigator.usb === 'undefined') {
      return this.notSupported()
    }

    let device
    try {
      device = await navigator.usb.requestDevice({
        filters: [{
          vendorId: this.vendorId,
          productId: this.productId
        }]
      })
    } catch (error) {
      throw new Error('USB Device permission denied.')
    }
    if (device) {
      await this.connected(device)
    }
  }

  private async checkDevices () {
    if (await this.checkNodeDevices()) {
      return
    }

    if (typeof navigator.usb === 'undefined') {
      return this.notSupported()
    }

    let devices = await navigator.usb.getDevices()
    for (let device of devices) {
      if (this.matchesTarget(device)) {
        await this.connected(device)
      }
    }
  }

  private async checkNodeDevices () {
    if (typeof window.node_usb === 'undefined') {
      return false
    }

    let nodeUsbDevice
    try {
      nodeUsbDevice = window.node_usb.findByIds(this.vendorId, this.productId)
    } catch { return false }

    if (nodeUsbDevice) {
      const webUsbDevice = nodeToWeb(nodeUsbDevice)
      await this.connected(webUsbDevice)
      return true
    }

    return false
  }

  private async attached (event: USBConnectionEvent) {
    if (event.device && this.matchesTarget(event.device)) {
      await this.connected(event.device)
    }
  }

  private async detached (event: USBConnectionEvent) {
    if (event.device && this.matchesTarget(event.device) && this.isConnectedDevices(event.device)) {
      await this.disconnected(event.device)
    }
  }

  protected async connected (device: WebUSBDevice) {
    if (this.isConnectedDevices(device)) {
      throw new Error('USB Device already connected.')
    }
    try {
      await device.open()
      this.connectedDevices.push(device)
    } catch (error) {
      throw new Error('USB Device cannot be opened.\n[Check driver installation.]')
    }
  }

  protected async disconnected (device: WebUSBDevice) {
    let index = this.connectedDevices.indexOf(device)
    if (index >= 0) {
      try {
        await device.close()
      } catch (error) { /*Ignore error*/ }
      this.connectedDevices.splice(index, 1)
    }
  }

  private matchesTarget (device: WebUSBDevice) {
    return device.vendorId === this.vendorId &&
      device.productId === this.productId
  }

  private isConnectedDevices (device: WebUSBDevice) {
    return this.connectedDevices.indexOf(device) >= 0
  }
}
