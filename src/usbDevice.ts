import { nodeToWeb } from './transform'

export default class USBDevice {
  private readonly vendorId: number
  private readonly productId: number
  protected connectedDevices: Array<WebUSBDevice> = []

  constructor (vendorId: number, productId: number) {
    this.vendorId = vendorId
    this.productId = productId

    navigator.usb.addEventListener('connect', event => { this.attached(event as USBConnectionEvent) })
    navigator.usb.addEventListener('disconnect', event => { this.detached(event as USBConnectionEvent) })

    this.checkDevices()
  }

  get isConnected () {
    return this.connectedDevices.length > 0
  }

  async start () {
    await this.requestPermission()
  }

  private async requestPermission () {
    if (this.checkNodeDevices()) {
      return
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
      this.connected(device)
    }
  }

  private async checkDevices () {
    if (this.checkNodeDevices()) {
      return
    }

    let devices = await navigator.usb.getDevices()
    devices.some(device => {
      if (this.matchesTarget(device)) {
        this.connected(device)
        return true
      }
      return
    })
  }

  private checkNodeDevices () {
    if (typeof window.node_usb === 'undefined') {
      return false
    }

    let nodeUsbDevice
    try {
      nodeUsbDevice = window.node_usb.findByIds(this.vendorId, this.productId)
    } catch { return false }

    if (nodeUsbDevice) {
      const webUsbDevice = nodeToWeb(nodeUsbDevice)
      this.connected(webUsbDevice)
      return true
    }

    return false
  }

  private attached (event: USBConnectionEvent) {
    if (event.device && this.matchesTarget(event.device)) {
      this.connected(event.device)
    }
  }

  private detached (event: USBConnectionEvent) {
    if (event.device && this.matchesTarget(event.device) && this.isConnectedDevices(event.device)) {
      this.disconnected(event.device)
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
