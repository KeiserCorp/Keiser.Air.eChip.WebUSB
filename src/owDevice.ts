import crc81wire from 'crc/crc81wire'
import { Mutex } from 'async-mutex'

const BULK_SIZE = 64
const SEARCH_INTERVAL = 500
const TIMEOUT_INTERVAL = 500

const isValidKeyId = (keyId: Uint8Array) => {
  return keyId[0] === 0x0C
}

const timeoutPromise: () => Promise<void> = () => {
  return new Promise(r => setTimeout(() => { r() }, TIMEOUT_INTERVAL))
}

class StateRegister {
  detectKey: boolean
  data: Uint8Array
  commCommandBufferStatus: number

  constructor (dataView: DataView) {
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
  private mutex: Mutex = new Mutex()
  private searching: boolean = false
  private usbDevice: USBDevice
  private interrupt: USBEndpoint
  private bulkIn: USBEndpoint
  private bulkOut: USBEndpoint
  private onDetectKeys: (keyRom: Array<Uint8Array>) => void

  constructor (usbDevice: USBDevice, onDetectKeys: (keyId: Array<Uint8Array>) => void = (k: Array<Uint8Array>) => { return }) {
    this.usbDevice = usbDevice
    this.onDetectKeys = onDetectKeys
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
    return true
  }

  async startSearch () {
    if (!this.searching) {
      this.searching = true
      this.awaitKey()
    }
  }

  async close () {
    this.searching = false
    if (this.usbDevice.configuration && this.usbDevice.configuration.interfaces[0]) {
      let releaseMutex = await this.mutex.acquire()
      try {
        await this.usbDevice.releaseInterface(this.usbDevice.configuration.interfaces[0].interfaceNumber)
      } catch (error) { /*Ignore error*/ }
      releaseMutex()
    }
  }

  private awaitKey () {
    setTimeout(async () => {
      if (this.searching) {
        let releaseMutex = await this.mutex.acquire()
        try {
          await Promise.race([
            this.keySearch(),
            timeoutPromise().then(() => { console.log('T/O') })
          ])
        } catch (error) {/*Ignore error*/}
        releaseMutex()
        this.awaitKey()
      }
    }, SEARCH_INTERVAL)
  }

  private async keySearch () {
    let validIds = []
    let result = await this.romSearch()
    if (isValidKeyId(result.key)) {
      validIds.push(result.key)
    }

    while (!result.lastDevice) {
      result = await result.next()
      if (isValidKeyId(result.key)) {
        validIds.push(result.key)
      }
    }
    this.onDetectKeys(validIds)
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

  private async write (data: Uint8Array, clearWire: boolean = false) {
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

  private async clearByte () {
    await this.read(1)
  }

  private async romCommand (keyRom: Uint8Array | null = null, overdrive: boolean = false) {
    let index
    let transferDataBuffer = new Uint8Array(8).buffer
    if (keyRom) {
      transferDataBuffer = keyRom.buffer
      index = overdrive ? 0x0069 : 0x0055
    } else {
      index = overdrive ? 0x003C : 0x00CC
    }

    let res = await this.usbDevice.controlTransferOut({
      requestType: 'vendor',
      recipient: 'device',
      request: 0x01,
      value: 0x0065,
      index: index
    })
    if (res.status !== 'ok') {
      throw new Error('1-Wire Device rom transfer failed.')
    }
    await this.setSpeed(overdrive)
    res = await this.usbDevice.transferOut(this.bulkIn.endpointNumber, transferDataBuffer)
  }

  private async romMatch (keyRom: Uint8Array, overdrive: boolean = false) {
    return this.romCommand(keyRom, overdrive)
  }

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
      key: searchResult.romId,
      lastDevice: searchResult.lastDevice,
      next: async () => this.romSearch(searchResult.lastDiscrepancy)
    }
  }

  private async romSubSearch (searchObject: ROMSearchObject): Promise < ROMSearchObject > {
    searchObject.idBit = await this.readBit()
    searchObject.cmpIdBit = await this.readBit()
    if (searchObject .idBit !== 1 || searchObject.cmpIdBit !== 1) {
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

  private async keyWrite (keyRom: Uint8Array, offset: number = 0, data: Uint8Array = new Uint8Array(0), overdrive: boolean = false) {
    const offsetMSB = (offset & 0xFF)
    const offsetLSB = (offset & 0xFF00) >> 8
    const endingOffset = data.length - 1

    const keyWriteToScratch = async (keyRom: Uint8Array, offset: number = 0, data: Uint8Array = new Uint8Array(0), overdrive: boolean = false) => {
      const keyWriteData = async (data: Uint8Array, offset: number = 0) => {
        const size = Math.min(BULK_SIZE, data.length - offset)
        const sendData = new Uint8Array(size)
        for (let x = 0; x < size; x++) {
          sendData[x] = data[offset + x]
        }
        await this.write(sendData)
        if ((data.length - (offset + size)) > 0) {
          await keyWriteData(data, offset + size)
        }
      }

      await this.reset()
      await this.romMatch(keyRom, overdrive)
      const writeCommand = new Uint8Array([0x0F, offsetMSB, offsetLSB])
      await this.write(writeCommand, true)
      await keyWriteData(data)
      await this.reset()
      await this.romMatch(keyRom, overdrive)
      const readCommand = new Uint8Array([0xAA])
      await this.write(readCommand)
      const result = await this.read(data.length)
      await this.clearByte()
      if (result.length !== data.length || !result.every((e, i) => e === data[i])) {
        await keyWriteToScratch(keyRom, offset, data, overdrive)
      }
    }

    await this.setSpeed(false)
    await keyWriteToScratch(keyRom, offset, data, overdrive)
    await this.reset()
    await this.romMatch(keyRom, overdrive)
    const writeCommand = new Uint8Array([0x55, offsetMSB, offsetLSB, endingOffset])
    await this.write(writeCommand, true)
  }

  async keyWriteAll (keyRom: Uint8Array, data: Array < Uint8Array > = [], overdrive: boolean = false) {
    const keyWriteAllOffset = async (keyRom: Uint8Array, page: number = 0, data: Array<Uint8Array> = [], overdrive: boolean = false) => {
      const offset = page * 32
      await this.keyWrite(keyRom, offset, data[page], overdrive)
      if (data.length > page + 1) {
        await keyWriteAllOffset(keyRom, page + 1, data, overdrive)
      }
    }

    await keyWriteAllOffset(keyRom, 0, data, overdrive)
  }

  async keyWriteDiff (keyRom: Uint8Array, newData: Array < Uint8Array > = [], oldData: Array < Uint8Array > = [], overdrive: boolean = false) {
    const keyWriteDiffOffset = async (keyRom: Uint8Array, page: number = 0, newData: Array<Uint8Array> = [], oldData: Array<Uint8Array> = [], overdrive: boolean = false) => {
      const offset = page * 32
      if (newData[page].length !== oldData[page].length || !newData[page].every((e,i) => e === oldData[page][i])) {
        await this.keyWrite(keyRom, offset, newData[page], overdrive)
      }
      if (newData.length > (page + 1)) {
        await keyWriteDiffOffset(keyRom, page + 1, newData, oldData, overdrive)
      }
    }

    if (oldData.length < newData.length) {
      oldData = await this.keyReadAll(keyRom, overdrive)
    }
    await keyWriteDiffOffset(keyRom, 0, newData, oldData, overdrive)
  }

  async keyReadAll (keyRom: Uint8Array, overdrive: boolean = false) {
    const keyReadPage = async (page: Uint8Array, index: number = 0) => {
      let result = await this.read(BULK_SIZE)
      result.forEach(e => page[index++] = e)
      if (index < page.length) {
        await keyReadPage(page, index)
      }
    }

    const keyReadMemory = async (memory: Array<Uint8Array> = new Array(256), pageIndex: number = 0) => {
      memory[pageIndex] = new Uint8Array(32)
      let buffer = (new Uint8Array(32)).fill(0xFF)
      await this.write(buffer)
      await keyReadPage(memory[pageIndex])
      if (pageIndex < memory.length - 1) {
        await keyReadMemory(memory, pageIndex + 1)
      }
      return memory
    }

    let releaseMutex = await this.mutex.acquire()
    await this.setSpeed(false)
    await this.reset()
    await this.romMatch(keyRom, overdrive)
    const writeCommand = new Uint8Array([0xF0, 0x00, 0x00])
    await this.write(writeCommand, true)
    let memory = keyReadMemory()
    releaseMutex()
    return memory
  }
}
