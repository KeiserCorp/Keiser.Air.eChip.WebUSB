import { crc81wire } from 'crc'

const keyRomToHexString = function (key: Uint8Array) {
  const hexChar = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F' ]
  let keyString = ''
  const clonedKey = Array
    .prototype
    .slice
    .call(key)
  clonedKey
    .reverse()
    .map(function (dataByte) {
      keyString += hexChar[(dataByte >> 4) & 0x0F] + hexChar[dataByte & 0x0F]
    })
  return keyString
}

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

interface ROMSearchObject {
  idBitNumber: number
  lastZero: number
  romByteNumber: number
  romByteMask: number
  searchResult: boolean,
  idBit: number
  cmpIdBit: number
  searchDirection: number
  romId: Uint8Array
  lastDevice: boolean
  lastDiscrepancy: number
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

    await this.keySearch()
    return true
  }

  async keySearch () {
    let result = await this.romSearch()
    console.log(result)
    while (!result.lastDevice) {
      result = await result.next()
      console.log(result)
    }
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
      request: 0x02,
      value: 0x02,
      index
    })
    if (res.status !== 'ok') {
      throw new Error('1-Wire Device set speed failed.')
    }
  }

  private async reset () {
    try {
      let res = await this.usbDevice.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 0x01,
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

  private async deviceReset () {
    await this.usbDevice.reset()
    let res = await this.usbDevice.controlTransferOut({
      requestType: 'vendor',
      recipient: 'device',
      request: 0x00,
      value: 0x00,
      index: 0x00
    })
    if (res.status !== 'ok') {
      throw new Error('1-Wire Device reset failed.')
    }
    await this.detectShort()
  }

  private async write (data: Uint8Array, clearWire: boolean) {
    try {
      let res = await this.usbDevice.transferOut(this.bulkIn.endpointNumber, data.buffer)
      if (res.status !== 'ok') {
        throw new Error()
      }
      await this.usbDevice.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 0x01,
        value: 0x1075,
        index: data.length
      })
      if (clearWire) {
        await this.read(data.length)
      }
    } catch (error) {
      throw new Error('1-Wire Device write failed.')
    }
  }

  private async writeBit (bit: number) {
    let res = await this.usbDevice.controlTransferOut({
      requestType: 'vendor',
      recipient: 'device',
      request: 0x01,
      value: 0x221 | (bit << 3),
      index: 0x00
    })
    if (res.status !== 'ok') {
      throw new Error('1-Wire Device write bit failed.')
    }
  }

  private async read (byteCount: number) {
    try {
      let res = await this.usbDevice.transferIn(this.bulkOut.endpointNumber, byteCount)
      if (res.status !== 'ok' || typeof res.data === 'undefined') {
        throw new Error()
      }
      return new Uint8Array(res.data.buffer)
    } catch (error) {
      throw new Error('1-Wire Device read failed.')
    }
  }

  private async readBit () {
    let res = await this.usbDevice.controlTransferOut({
      requestType: 'vendor',
      recipient: 'device',
      request: 0x01,
      value: 0x29,
      index: 0x00
    })
    if (res.status !== 'ok') {
      throw new Error('1-Wire Device read bit transfer failed.')
    }
    return (await this.read(1))[0]
  }

  // private async clearByte () {
  //   await this.read(1)
  // }

  // private async romCommand (keyRom: Uint8Array | null = null, overdrive: boolean = false) {
  //   let index
  //   let transferDataBuffer = new Uint8Array(8).buffer
  //   if (keyRom) {
  //     transferDataBuffer = keyRom.buffer
  //     if (overdrive) {
  //       index = 0x0069
  //     } else {
  //       index = 0x0055
  //     }
  //   } else {
  //     if (overdrive) {
  //       index = 0x003C
  //     } else {
  //       index = 0x00CC
  //     }
  //   }

  //   let res = await this.usbDevice.controlTransferOut({
  //     requestType: 'vendor',
  //     recipient: 'device',
  //     request: 0x01,
  //     value: 0x0065,
  //     index: index
  //   })
  //   if (res.status !== 'ok') {
  //     throw new Error('1-Wire Device rom transfer failed.')
  //   }
  //   await this.setSpeed(overdrive)
  //   res = await this.usbDevice.transferOut(this.bulkIn.endpointNumber, transferDataBuffer)
  // }

  // private async romMatch (keyRom: Uint8Array) {
  //   return this.romCommand(keyRom, false)
  // }

  // private async romMatchOverdrive (keyRom: Uint8Array) {
  //   return this.romCommand(keyRom, true)
  // }

  // private async romSkip () {
  //   return this.romCommand()
  // }

  // private async romSkipOverdrive () {
  //   return this.romCommand(null, true)
  // }

  private async romSearch (lastDiscrepancy: number = 0) {
    await this.setSpeed(false)
    await this.reset()
    await this.write(new Uint8Array([0xF0]), true)
    let searchResult = await this.romSubSearch({
      idBitNumber: 1,
      lastZero: 0,
      romByteNumber: 0,
      romByteMask: 1,
      searchResult: false,
      idBit: 0,
      cmpIdBit: 0,
      searchDirection: 0,
      romId: new Uint8Array(8),
      lastDevice: false,
      lastDiscrepancy: lastDiscrepancy
    })

    return {
      key: { raw: searchResult.romId, string: keyRomToHexString(searchResult.romId) },
      lastDevice: searchResult.lastDevice,
      next: async () => this.romSearch(searchResult.lastDiscrepancy)
    }
  }

  private async romSubSearch (searchObject: ROMSearchObject): Promise<ROMSearchObject> {
    searchObject.idBit = await this.readBit()
    searchObject.cmpIdBit = await this.readBit()
    if (searchObject.idBit !== 1 || searchObject.cmpIdBit !== 1) {
      if (searchObject.idBit !== searchObject.cmpIdBit) {
        searchObject.searchDirection = searchObject.idBit
      } else {
        if (searchObject.idBitNumber < searchObject.lastDiscrepancy) {
          searchObject.searchDirection = ((searchObject.romId[searchObject.romByteNumber] & searchObject.romByteMask) > 0) ? 1 : 0
        } else {
          searchObject.searchDirection = (searchObject.idBitNumber === searchObject.lastDiscrepancy) ? 1 : 0
        }
        if (searchObject.searchDirection === 0) {
          searchObject.lastZero = searchObject.idBitNumber
        }
      }
      if (searchObject.searchDirection === 1) {
        searchObject.romId[searchObject.romByteNumber] |= searchObject.romByteMask
      } else {
        searchObject.romId[searchObject.romByteNumber] &= ~searchObject.romByteMask
      }

      await this.writeBit(searchObject.searchDirection)

      searchObject.idBitNumber++
      searchObject.romByteMask <<= 1
      if (searchObject.romByteMask >= 256) {
        searchObject.romByteNumber++
        searchObject.romByteMask = 1
      }
      if (searchObject.romByteNumber < 8) {
        return this.romSubSearch(searchObject)
      } else {
        if (searchObject.idBitNumber >= 65 && crc81wire(new Buffer(searchObject.romId)) === 0) {
          searchObject.lastDiscrepancy = searchObject.lastZero
          if (searchObject.lastDiscrepancy === 0) {
            searchObject.lastDevice = true
          }
          searchObject.searchResult = true
        }
        if (searchObject.searchResult === false || searchObject.romId[0] === 0) {
          searchObject.lastDiscrepancy = 0
          searchObject.lastDevice = false
          searchObject.searchResult = false
        }
        return searchObject
      }

    } else {
      return searchObject
    }
  }
}
