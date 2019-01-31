export interface EChipObject {
  machineData: {[index: string]: MachineObject}
  rawData: Uint8Array[]
}

export interface MachineObject {
  position: {
    chest: number | null
    rom2: number | null
    rom1: number | null
    seat: number | null
  }
  sets: MachineSet[]
}

export interface MachineSet {
  version: string
  serial: string
  time: Date
  resistance: number
  precision: Precision
  units: ForceUnit,
  repetitions: number,
  peak: number | null,
  work: number | null,
  distance: number | null,
  test: MachineTest | null
}

export interface MachineTest {
  type: number,
  high: MachineTestResult | null,
  low: MachineTestResult | null
}

export interface MachineTestResult {
  power: number,
  velocity: number,
  force: number,
  position: number
}

export enum Precision { dec, int }
export enum ForceUnit { lb, kg, ne, er }
export enum TestType { power6r, a4206r, a42010r }

export function EChipParser (data: Uint8Array[]) {
  if (!isValidData(data)) {
    throw new Error('Data structure failed CRC check')
  }

  return parseDirectory(data)
}

const isValidData = (data: Uint8Array[]) => {
  return data.every(page => {
    return isEmptyPage(page) || isCrcValid(page)
  })
}

const isEmptyPage = (page: Uint8Array) => {
  return page.every(byte => byte === 0x55)
}

const isCrcValid = (page: Uint8Array) => {
  let crc = 0
  for (let byte of page) {
    for (let x = 0; x < 8; x++) {
      let odd = (byte ^ crc) % 2
      crc = crc >> 1
      byte = byte >> 1
      if (odd) {
        crc = crc ^ 0xA001
      }
    }
  }
  return crc === 0xB001
}

const parseDirectory = (data: Uint8Array[]) => {
  let echipObject: EChipObject = {
    machineData: {},
    rawData: data
  }
  for (let y = 1; y <= 8; y++) {
    for (let x = 0; x < 3; x++) {
      let pageOffset = (y * 32) - 2
      let bufferOffset = x * 10
      if (data[pageOffset][bufferOffset] === 1) {
        let model = byteToString(data[pageOffset][bufferOffset + 1], data[pageOffset][bufferOffset + 2])
        echipObject.machineData[model] = {
          position: {
            chest: valueOrNull(data[pageOffset][bufferOffset + 3]),
            rom2: valueOrNull(data[pageOffset][bufferOffset + 4]),
            rom1: valueOrNull(data[pageOffset][bufferOffset + 5]),
            seat: valueOrNull(data[pageOffset][bufferOffset + 6])
          },
          sets: []
        }
        let firstPage = data[pageOffset][bufferOffset + 7]
        parseMachineSet(data, echipObject.machineData[model], firstPage)
      }
    }
  }
  return echipObject
}

const parseMachineSet = (data: Uint8Array[], machineObject: MachineObject, page: number) =>  {
  let fatBuffer = (Math.floor(page / 32) * 32) + 31
  let fatBufferOffset = (page % 30)
  let nextPage = data[fatBuffer][fatBufferOffset]
  let dataPage = data[page]
  let model = byteToInt(dataPage[7], dataPage[8])

  let set = {
    version : byteToString(dataPage[12], dataPage[11], dataPage[10], dataPage[9]),
    serial : '',
    time : byteToDate(dataPage[0], dataPage[1], dataPage[2], dataPage[3]),
    resistance : byteToInt(dataPage[4], dataPage[5]),
    precision : Precision.int,
    units : ForceUnit.lb,
    repetitions : dataPage[6],
    peak: null,
    work: null,
    distance: null,
    test: null
  } as MachineSet

  set.serial = byteToSerialString(dataPage[13], dataPage[14], dataPage[15], dataPage[16], dataPage[17], set.version)

  if (unitVersion(set.version)) {
    if ((dataPage[17] & 0x80) === 0x80) {
      set.resistance = set.resistance / 10
      set.precision = Precision.dec
    }

    switch (dataPage[17] & 0x60) {
      case 0x00:
        set.units = ForceUnit.lb
        break
      case 0x20:
        set.units = ForceUnit.kg
        break
      case 0x40:
        set.units = ForceUnit.ne
        break
      case 0x60:
        set.units = ForceUnit.er
        break
    }
  }

  if (testVersion(set.version)) {
    if (set.repetitions <= 254 && set.repetitions >= 252) {
      let test = {
        type: TestType.power6r,
        low: null,
        high: null
      } as MachineTest
      switch (set.repetitions) {
        case 254:
          test.type = TestType.power6r
          test.low = decodePackData(dataPage, 18)
          test.high = decodePackData(dataPage, 24)
          break
        case 253:
          test.type = TestType.a4206r
          break
        case 252:
          test.type = TestType.a42010r
          break
      }
      set.test = test
    } else {
      if (peakPowerVersion(set.version)) {
        set.peak = byteToInt(dataPage[20], dataPage[21])
        set.work = Math.round(byteToInt(dataPage[22], dataPage[23], dataPage[24], dataPage[25]) / 64)

        if ((model & 0xFF00) === 0x3200) {
          set.distance = byteToInt(dataPage[18], dataPage[19])
        }
      }
    }
  }

  if (!machineObject.sets) {
    machineObject.sets = []
  }
  machineObject
    .sets
    .push(set)

  if ((nextPage & 30) !== 30) {
    parseMachineSet(data, machineObject, nextPage)
  }
}

// -----------------------------------------------------------
// Helper Methods
// -----------------------------------------------------------

const valueOrNull = (value: number) => {
  return (value === 255) ? null : value
}

const testVersion = (version: string) => {
  return parseInt(version, 16) > 0x2F6579F0
}

const peakPowerVersion = (version: string) => {
  return parseInt(version, 16) > 0x32BA5C89
}

const unitVersion = (version: string) => {
  return parseInt(version, 16) > 0x318E4F00
}

/**
 * Byte to String Function
 * @param args  Accepts arguments in ascending order of significance (lsb first)
 * @returns     Returns hex string
 */
const byteToString = (...args: number[]) => {
  let res = ''
  args.reverse().forEach(byte => res += ('00' + byte.toString(16)).substr(-2).toUpperCase())
  return res
}

/**
 * Byte to Int Function
 * @param args  Accepts arguments in ascending order of significance (lsb first)
 * @returns     Returns integer value
 */
const byteToInt = (...args: number[]) => {
  let res = 0
  args.forEach((byte, index) => res += (byte & 0xFF) << (8 * index))
  return res
}

/**
 * Byte to Date Function
 * @param args  Accepts arguments in ascending order of significance (lsb first)
 * @returns     Returns local offset Date value
 */
const byteToDate = (...args: number[]) => {
  return new Date(byteToInt(...args) * 1000)
}

const dateToSerialString = (date: Date) => {
  return ('00' + (date.getUTCMonth() + 1)).substr(-2) +
  ('00' + date.getUTCDate()).substr(-2) + ' ' +
  date.getUTCFullYear() + ' ' +
  ('00' + date.getUTCHours()).substr(-2) +
  ('00' + date.getUTCMinutes()).substr(-2) + ' ' +
  ('00' + date.getUTCSeconds()).substr(-2)
}

const byteToSerialString = (lsb: number, byte2: number, byte3: number, msb: number, channel: number, version: string) => {
  let date = byteToDate(lsb, byte2, byte3, msb)
  let serial = dateToSerialString(date)
  if (unitVersion(version)) {
    serial += ('00' + ((channel & 0x1F) + 0x20).toString()).substr(-2)
  } else {
    serial += ((channel & 0xF0) / 0x10).toString(16)
    serial += (channel & 0x1F).toString(16)
  }
  return serial
}

const decodePackData = function (dataPage: Uint8Array, pageOffset: number) {
  return {
    power : dataPage[pageOffset] + ((dataPage[pageOffset + 2] & 0x1F) << 8),
    velocity : dataPage[pageOffset + 1] + ((dataPage[pageOffset + 2] & 0xE0) << 3) + (((dataPage[pageOffset + 2] & 0x80) >> 7) * 0xF8),
    force : (dataPage[pageOffset + 3] + ((dataPage[pageOffset + 5] & 0xF0) << 4)) << 4,
    position : dataPage[pageOffset + 4] + ((dataPage[pageOffset + 5] & 0x0F) << 8)
  } as MachineTestResult
}
