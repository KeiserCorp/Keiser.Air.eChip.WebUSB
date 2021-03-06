import { Logger } from './logger'
import crc81wire from 'crc/crc81wire'
import { Mutex } from 'async-mutex'
import { TimeoutStrategy, Policy, TaskCancelledError } from 'cockatiel'
import { WebUSBDevice, USBEndpoint, USBInTransferResult } from '../types/w3c-web-usb'

const BULK_SIZE = 64
const SEARCH_INTERVAL = 500
const TIMEOUT_INTERVAL = 200
const RETRY_ATTEMPTS = 3
const ALT_INTERFACE = 1

const isValidChipId = (chipId: Uint8Array) => {
  return (chipId[0] === 0x0C && chipId[7] !== 0) || (chipId[0] === 0x24 && chipId[7] !== 0) || (chipId[0] === 0x2D && chipId[7] !== 0)
}

const timeoutPolicy = Policy.timeout(TIMEOUT_INTERVAL, TimeoutStrategy.Cooperative)
const timeoutRetryPolicy = Policy.handleType(TaskCancelledError).retry().attempts(RETRY_ATTEMPTS)

class StateRegister {
  detectChip: boolean
  data: Uint8Array
  dataOutBufferStatus: number
  dataInBufferStatus: number
  commCommandBufferStatus: number

  constructor (dataView: DataView) {
    const dataArray = new Uint8Array(dataView.buffer)
    this.commCommandBufferStatus = dataArray[11]
    this.dataOutBufferStatus = dataArray[12]
    this.dataInBufferStatus = dataArray[13]
    this.detectChip = dataArray[16] === 165
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

export class OWDevice {
  private mutex: Mutex = new Mutex()
  private searching: boolean = false
  private usbDevice: WebUSBDevice
  private interrupt: USBEndpoint
  private bulkIn: USBEndpoint
  private bulkOut: USBEndpoint
  private onDetectChips: (chipRom: Array<Uint8Array>) => void

  constructor (usbDevice: WebUSBDevice, onDetectChips: (chipId: Array<Uint8Array>) => void = (k: Array<Uint8Array>) => { return }) {
    this.usbDevice = usbDevice
    this.onDetectChips = onDetectChips
    const altInterface = this.usbDevice.configurations[0].interfaces[0].alternates[ALT_INTERFACE]
    this.interrupt = altInterface.endpoints[0]
    this.bulkIn = altInterface.endpoints[1]
    this.bulkOut = altInterface.endpoints[2]
  }

  async claim () {
    const usbConfiguration = this.usbDevice.configurations[0]
    const usbInterface = usbConfiguration.interfaces[0]
    try {
      if (!this.usbDevice.configuration || this.usbDevice.configuration.configurationValue !== usbConfiguration.configurationValue) {
        await this.usbDevice.selectConfiguration(usbConfiguration.configurationValue)
      }
      await this.usbDevice.claimInterface(usbInterface.interfaceNumber)
      await this.usbDevice.selectAlternateInterface(usbInterface.interfaceNumber, usbInterface.alternates[ALT_INTERFACE].alternateSetting)
      await this.deviceReset()
    } catch (error) {
      throw new Error('1-Wire Device interface cannot be claimed.')
    }
    return true
  }

  async startSearch () {
    if (!this.searching) {
      this.searching = true
      void this.awaitChip()
    }
  }

  async close () {
    this.searching = false
    let releaseMutex = await this.mutex.acquire()
    try {
      if (this.usbDevice.configuration && this.usbDevice.configuration.interfaces[0]) {
        await this.usbDevice.releaseInterface(this.usbDevice.configuration.interfaces[0].interfaceNumber)
      }
    } catch (error) {
      Logger.warn(`Close Error: ${error}`)
    }
    releaseMutex()
  }

  private async awaitChip () {
    if (!this.searching) {
      return
    }

    let releaseMutex = await this.mutex.acquire()
    try {
      await timeoutPolicy.execute(async () => this.chipSearch())
    } catch (error) {
      Logger.warn(`Await Chip Error: ${error}`)
      await this.deviceReset()
    }
    releaseMutex()
    setTimeout(async () => void this.awaitChip(), SEARCH_INTERVAL)
  }

  private async chipSearch () {
    let validIds = []
    try {
      let result = await this.romSearch()

      if (result.result) {
        if (isValidChipId(result.chipId)) {
          validIds.push(result.chipId)
        }

        while (result.result && !result.lastDevice) {
          result = await result.next()
          if (result.result && isValidChipId(result.chipId)) {
            validIds.push(result.chipId)
          }
        }
        this.onDetectChips(validIds)
      }
    } catch (error) {
      await this.deviceReset()
    }
  }

  private async deviceStatus () {
    let transferResult = await this.usbDevice.transferIn(this.interrupt.endpointNumber, 0x20)
    if (!transferResult.data) {
      throw new Error('1-Wire Device status read error.')
    }
    return new StateRegister(transferResult.data)
  }

  private async bufferClear () {
    let deviceStatus = await this.deviceStatus()
    if (deviceStatus.commCommandBufferStatus !== 0) {
      await this.bufferClear()
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
    await this.bufferClear()
  }

  private async deviceReset () {
    await timeoutRetryPolicy.execute(async () => {
      await this.usbDevice.reset()
      let res = await timeoutPolicy.execute(async () => {
        return this.usbDevice.controlTransferOut({
          requestType: 'vendor',
          recipient: 'device',
          request: 0x00,
          value: 0x00,
          index: 0x00
        })
      })
      if (res.status !== 'ok') {
        throw new Error('1-Wire Device reset failed.')
      }
      await this.bufferClear()
    })
  }

  private async write (data: Uint8Array, clearWire: boolean = false) {
    try {
      // To-Do: Test timeout (ref: read())
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
        let cleared = 0
        do {
          cleared += (await this.read(data.length - cleared)).length
        } while (cleared < data.length)
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
    let transfer = this.usbDevice.transferIn(this.bulkOut.endpointNumber, byteCount)
    let timeout = new Promise((r,e) => setTimeout(() => e(), TIMEOUT_INTERVAL))
    try {
      let res = await (Promise.race([
        transfer,
        timeout
      ]) as Promise<USBInTransferResult>)
      if (res.status !== 'ok' || !res.data) {
        throw new Error()
      }
      return new Uint8Array(res.data.buffer, res.data.byteOffset, res.data.byteLength)
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

  private async romCommand (chipRom: Uint8Array | null = null, overdrive: boolean = false) {
    // Index Value Ref: http://owfs.sourceforge.net/commands.html
    let index = chipRom ? (overdrive ? 0x0069 : 0x0055) : (overdrive ? 0x003C : 0x00CC)
    let transferDataBuffer = chipRom ? chipRom.buffer : new Uint8Array(8).buffer

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

  private async romMatch (chipRom: Uint8Array, overdrive: boolean = false) {
    return this.romCommand(chipRom, overdrive)
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
      result: searchResult.searchResult,
      chipId: searchResult.romId,
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
        if (searchObject.idBitNumber >= 65 && crc81wire(Buffer.from(searchObject.romId)) === 0) {
          searchObject.lastDiscrepancy = searchObject.lastZero
          if (searchObject.lastDiscrepancy === 0) {
            searchObject.lastDevice = true
          }
          searchObject.searchResult = true
        }
        if (searchObject.searchResult === false || searchObject.romId[0] === 0) {
          searchObject.lastDiscrepancy = 0
          searchObject.lastDevice = true
          searchObject.searchResult = false
        }
        return searchObject
      }

    } else {
      return searchObject
    }
  }

  private async dataChipWrite (chipRom: Uint8Array, offset: number = 0, data: Uint8Array = new Uint8Array(0), overdrive: boolean = false) {
    const offsetMSB = (offset & 0xFF)
    const offsetLSB = (offset & 0xFF00) >> 8
    const endingOffset = data.length - 1

    const dataChipWriteToScratch = async (chipRom: Uint8Array, offset: number = 0, data: Uint8Array = new Uint8Array(0), overdrive: boolean = false) => {
      const dataChipWriteData = async (data: Uint8Array, offset: number = 0) => {
        const size = Math.min(BULK_SIZE, data.length - offset)
        const sendData = new Uint8Array(size)
        for (let x = 0; x < size; x++) {
          sendData[x] = data[offset + x]
        }
        await this.write(sendData)
        if ((data.length - (offset + size)) > 0) {
          await dataChipWriteData(data, offset + size)
        }
      }

      await this.reset()
      await this.romMatch(chipRom, overdrive)
      const writeCommand = new Uint8Array([0x0F, offsetMSB, offsetLSB])
      await this.write(writeCommand, true)
      await dataChipWriteData(data)
      await this.reset()
      await this.romMatch(chipRom, overdrive)
      const readCommand = new Uint8Array([0xAA])
      await this.write(readCommand)
      const result = await this.read(data.length)
      await this.clearByte()
      if (result.length !== data.length || !result.every((e, i) => e === data[i])) {
        await dataChipWriteToScratch(chipRom, offset, data, overdrive)
      }
    }

    await this.setSpeed(overdrive)
    await dataChipWriteToScratch(chipRom, offset, data, overdrive)
    await this.reset()
    await this.romMatch(chipRom, overdrive)
    const writeCommand = new Uint8Array([0x55, offsetMSB, offsetLSB, endingOffset])
    await this.write(writeCommand, true)
  }

  async dataChipWriteAll (chipRom: Uint8Array, data: Array<Uint8Array> = [], overdrive: boolean = false) {
    const dataChipWriteAllOffset = async (chipRom: Uint8Array, page: number = 0, data: Array<Uint8Array> = [], overdrive: boolean = false) => {
      const offset = page * 32
      await this.dataChipWrite(chipRom, offset, data[page], overdrive)
      if (data.length > page + 1) {
        await dataChipWriteAllOffset(chipRom, page + 1, data, overdrive)
      }
    }

    const releaseMutex = await this.mutex.acquire()
    const start = performance.now()
    try {
      await this.deviceReset()
      await dataChipWriteAllOffset(chipRom, 0, data, overdrive)
      Logger.info('Write All Completed: ' + Math.round(performance.now() - start) + 'ms')
    } finally {
      releaseMutex()
    }
  }

  async dataChipWriteDiff (chipRom: Uint8Array, newData: Array<Uint8Array> = [], oldData: Array<Uint8Array> = [], overdrive: boolean = false) {
    const dataChipWriteDiffOffset = async (chipRom: Uint8Array, page: number = 0, newData: Array<Uint8Array> = [], oldData: Array<Uint8Array> = [], overdrive: boolean = false) => {
      const offset = page * 32
      if (newData[page].length !== oldData[page].length || !newData[page].every((e,i) => e === oldData[page][i])) {
        await this.dataChipWrite(chipRom, offset, newData[page], overdrive)
      }
      if (newData.length > (page + 1)) {
        await dataChipWriteDiffOffset(chipRom, page + 1, newData, oldData, overdrive)
      }
    }

    if (oldData.length !== newData.length) {
      throw new Error('Cannot perform diff on provided data')
    }

    const releaseMutex = await this.mutex.acquire()
    const start = performance.now()
    try {
      await this.deviceReset()
      await dataChipWriteDiffOffset(chipRom, 0, newData, oldData, overdrive)
      Logger.info('Write Diff Completed: ' + Math.round(performance.now() - start) + 'ms')
    } finally {
      releaseMutex()
    }

  }

  async dataChipReadAll (chipRom: Uint8Array, overdrive: boolean = false) {
    const dataChipReadPage = async (page: Uint8Array, index: number = 0) => {
      const size = Math.min(BULK_SIZE, page.length - index)
      const result = await this.read(size)
      result.forEach(e => page[index++] = e)
      if (index < page.length) {
        await dataChipReadPage(page, index)
      }
    }

    const dataChipReadMemory = async (memory: Array<Uint8Array> = new Array(256), pageIndex: number = 0) => {
      memory[pageIndex] = new Uint8Array(32)
      let buffer = (new Uint8Array(32)).fill(0xFF)
      await this.write(buffer)
      await dataChipReadPage(memory[pageIndex++])
      if (pageIndex < memory.length) {
        await dataChipReadMemory(memory, pageIndex)
      }
      return memory
    }

    const dataChipReadAllSteps = async (overdrive: boolean) => {
      await this.setSpeed(overdrive)
      await this.reset()
      await this.romMatch(chipRom, overdrive)
      const writeCommand = new Uint8Array([0xF0, 0x00, 0x00])
      await this.write(writeCommand, true)
      return dataChipReadMemory()
    }

    const releaseMutex = await this.mutex.acquire()
    const start = performance.now()
    try {
      try {
        await this.deviceReset()
        return await dataChipReadAllSteps(overdrive)
      } catch (error) {
        Logger.warn('Read All ' + (overdrive ? 'Overdrive ' : '') + 'Failed: ' + error.message)
        await this.deviceReset()
        return await dataChipReadAllSteps(false)
      }
    } catch (error) {
      Logger.error('Read All Failed: ' + error.message)
      throw error
    } finally {
      await this.deviceReset()
      releaseMutex()
      Logger.info('Read All Completed: ' + Math.round(performance.now() - start) + 'ms')
    }
  }

  async tzChipWrite (chipRom: Uint8Array, tzString: Uint8Array, tzOffset: Uint8Array) {
    const releaseMutex = await this.mutex.acquire()
    const start = performance.now()
    try {
      await this.tzChipWriteOffset(chipRom, tzString, 0x00, 0x00)
      await this.tzChipWriteOffset(chipRom, tzOffset, 0x08, 0x00)
    } catch (error) {
      Logger.error('TZ Write Failed: ' + error.message)
      throw error
    } finally {
      await this.deviceReset()
      releaseMutex()
      Logger.info('TZ Write Completed: ' + Math.round(performance.now() - start) + 'ms')
    }
  }

  private async tzChipWriteOffset (chipRom: Uint8Array, data: Uint8Array, offMSB: number, offLSB: number) {
    await this.reset()
    await this.romCommand(chipRom, false)
    await this.write(new Uint8Array([0x0F, offMSB, offLSB, ...data]), true)

    await this.reset()
    await this.romCommand(chipRom, false)
    await this.write(new Uint8Array([0xAA, offMSB, offLSB, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]), false)
    await this.read(1)

    let auth = []
    do {
      auth.push((await this.read(1))[0])
    } while (auth.length < 3)

    let crc = []
    do {
      crc.push((await this.read(1))[0])
    } while (crc.length < 8)

    if (!crc.every((value, index) => value === data[index])) {
      throw Error('Scratchpad data does not match input data')
    }

    if (auth[2] !== 0x07) {
      throw Error('Copy to scratchpad failed')
    }

    await this.reset()
    await this.romCommand(chipRom, false)
    await this.write(new Uint8Array([0x55,...auth]), true)
  }

  async rtcChipWrite (chipRom: Uint8Array, data: Uint8Array) {
    const releaseMutex = await this.mutex.acquire()
    const start = performance.now()
    try {
      await this.reset()
      await this.romCommand(chipRom, false)
      await this.write(new Uint8Array([0x99]), true)
      await this.write(data, false)
      await this.reset()
    } catch (error) {
      Logger.error('RTC Write Failed: ' + error.message)
      throw error
    } finally {
      await this.deviceReset()
      releaseMutex()
      Logger.info('RTC Write Completed: ' + Math.round(performance.now() - start) + 'ms')
    }
  }
}
