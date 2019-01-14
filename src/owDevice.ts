class StateRegister {
  detectKey: boolean
  data: Uint8Array
  commCommandBufferStatus: number

  constructor (dataView: DataView)  {
    const dataArray = new Uint8Array(dataView.buffer)
    this.commCommandBufferStatus = dataArray[11]
    this.detectKey = dataArray[16] === 165
    this.data = dataArray.slice(16, dataArray.length)
  }
}

export default class OWDevice {
  private usbDevice: USBDevice
  private interrupt: USBEndpoint
  private bulkIn: USBEndpoint
  private bulkOut: USBEndpoint

  constructor (usbDevice: USBDevice) {
    this.usbDevice = usbDevice
    const altInterface = this.usbDevice.configurations[0].interfaces[0].alternates[1]
    this.interrupt = altInterface.endpoints[0]
    this.bulkIn = altInterface.endpoints[1]
    this.bulkOut = altInterface.endpoints[2]
  }

  async claim () {
    const usbConfiguration = this.usbDevice.configurations[0]
    const usbInterface = usbConfiguration.interfaces[0]
    try {
      if (this.usbDevice.configuration === null || typeof this.usbDevice.configuration === 'undefined' || this.usbDevice.configuration.configurationValue !== usbConfiguration.configurationValue) {
        await this.usbDevice.selectConfiguration(usbConfiguration.configurationValue)
      }
      await this.usbDevice.claimInterface(usbInterface.interfaceNumber)
      await this.usbDevice.selectAlternateInterface(usbInterface.interfaceNumber, usbInterface.alternates[1].alternateSetting)
    } catch (error) {
      throw new Error('1-Wire Device interface cannot be claimed.')
    }
    await this.reset()
    await this.setSpeed(true)
    return true
  }

  async reset () {
    try {
      let res = await this.usbDevice.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 0x1,
        value: 0x0C4B,
        index: 0x0001
      })
      if (res.status !== 'ok') {
        throw new Error('1-Wire Device reset request failed.')
      }
      await this.detectShort()
    } catch (error) {
      await this.deviceReset()
    }
  }

  async write (data: Uint8Array, clearWire: boolean) {
    let res = await this.usbDevice.transferOut(this.bulkOut.endpointNumber, data.buffer)
    if (res.status !== 'ok') {
      throw new Error('1-Wire Device write failed.')
    }
    await this.usbDevice.controlTransferOut({
      requestType: 'vendor',
      recipient: 'device',
      request: 0x1,
      value: 0x1075,
      index: data.length
    })
    if (clearWire) {
      await this.read(data.length)
    }
  }

  async read (byteCount: number) {
    let res = await this.usbDevice.transferIn(this.bulkIn.endpointNumber, byteCount)
    if (res.status !== 'ok' || typeof res.data === 'undefined') {
      throw new Error('1-Wire Device read failed.')
    }
    return new Uint8Array(res.data.buffer)
  }

  private async deviceStatus () {
    let transferResult = await this.usbDevice.transferIn(this.interrupt.endpointNumber, 0x20)
    if (!transferResult.data) {
      throw new Error('1-Wire Device status read error.')
    }
    return new StateRegister(transferResult.data)
  }

  private async detectShort () {
    let deviceStatus = await this.deviceStatus()
    if (deviceStatus.commCommandBufferStatus !== 0 || (deviceStatus.detectKey && deviceStatus.data[0])) {
      throw new Error('1-Wire Device short detected.')
    }
  }

  private async setSpeed (overdrive: boolean) {
    const index = overdrive ? 0x0002 : 0x0001
    let res = await this.usbDevice.controlTransferOut({
      requestType: 'vendor',
      recipient: 'device',
      request: 0x2,
      value: 0x2,
      index
    })
    if (res.status !== 'ok') {
      throw new Error('1-Wire Device set speed failed.')
    }
  }

  private async deviceReset () {
    let res = await this.usbDevice.controlTransferOut({
      requestType: 'vendor',
      recipient: 'device',
      request: 0x0,
      value: 0x0,
      index: 0x0
    })
    if (res.status !== 'ok') {
      throw new Error('1-Wire Device reset failed.')
    }
    await this.detectShort()
  }
}
