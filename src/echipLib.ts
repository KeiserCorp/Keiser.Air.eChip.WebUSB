export interface EChipObject {
  machineData: {[index: string]: MachineObject}
  rawData: Uint8Array[]
}

export interface MachineObject {
  position: MachinePosition
  sets: MachineSet[]
}

export interface MachinePosition {
  chest: number | null
  rom2: number | null
  rom1: number | null
  seat: number | null
}

export interface MachineSet {
  version: string
  serial: string
  time: string
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
            chest: toValue(data[pageOffset][bufferOffset + 3]),
            rom2: toValue(data[pageOffset][bufferOffset + 4]),
            rom1: toValue(data[pageOffset][bufferOffset + 5]),
            seat: toValue(data[pageOffset][bufferOffset + 6])
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

const parseMachineSet = (data: Uint8Array[], machineObject: MachineObject, page: number) => {
  let fatBuffer = (Math.floor(page / 32) * 32) + 31
  let fatBufferOffset = (page % 30)
  let nextPage = data[fatBuffer][fatBufferOffset]
  let dataPage = data[page]
  let model = byteToInt(dataPage[7], dataPage[8])

  let set = {
    version : byteToString(dataPage[12], dataPage[11], dataPage[10], dataPage[9]),
    serial : '',
    time : byteToDate(dataPage[0], dataPage[1], dataPage[2], dataPage[3]).toISOString(),
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
    if (set.repetitions >= 252 && set.repetitions <= 254) {
      let test = {
        type: TestType.power6r,
        low: null,
        high: null
      } as MachineTest
      switch (set.repetitions) {
        case 254:
          test.type = TestType.power6r
          test.low = unpackData(dataPage, 18)
          test.high = unpackData(dataPage, 24)
          set.repetitions = 6
          break
        case 253:
          test.type = TestType.a4206r
          set.repetitions = 6
          break
        case 252:
          test.type = TestType.a42010r
          set.repetitions = 10
          break
      }
      set.test = test
    } else {
      if (peakPowerVersion(set.version)) {
        set.peak = byteToInt(dataPage[20], dataPage[21])
        set.work = Math.round((byteToInt(dataPage[22], dataPage[23], dataPage[24], dataPage[25]) / 64) * 100) / 100

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

export function EChipBuilder (machines: {[index: string ]: MachineObject}) {
  let data = generateEmptyEChip()
  const maxDirectories = 24
  const maxRecords = 242
  let directoryIndex = 0
  let recordIndex = 0

  Object.keys(machines).forEach(model => {
    if (directoryIndex > maxDirectories && recordIndex > maxRecords) {
      throw new Error('Data structure exceeds memory capacity.')
    }

    const machine = machines[model]
    const modelValue = parseInt(model, 16)
    const pageOffset = (Math.floor(directoryIndex / 3) * 32) + 30
    const bufferOffset = (directoryIndex % 3) * 10
    data[pageOffset][bufferOffset] = 1
    const modelBytes = intToByte(modelValue)
    data[pageOffset][bufferOffset + 1] = modelBytes[0]
    data[pageOffset][bufferOffset + 2] = modelBytes[1]
    data[pageOffset][bufferOffset + 3] = toByte(machine.position.chest)
    data[pageOffset][bufferOffset + 4] = toByte(machine.position.rom2)
    data[pageOffset][bufferOffset + 5] = toByte(machine.position.rom1)
    data[pageOffset][bufferOffset + 6] = toByte(machine.position.seat)
    data[pageOffset][bufferOffset + 7] = recordIndex

    machine.sets.forEach((set, index) => {
      let recordPage = (Math.floor(recordIndex / 30) * 32) + (recordIndex % 30)
      buildMachineSet(modelValue, set, machine.position, data[recordPage])

      let fatPage = (Math.floor(recordIndex / 30) * 32) + 31
      let fatPageOffset = recordIndex % 30
      data[fatPage][fatPageOffset] = (index + 1 < machine.sets.length) ? recordIndex + 1 : 0xFE
      recordIndex++
    })

    directoryIndex++
  })

  buildCRC(data)

  return data
}

const buildMachineSet = (modelValue: number, set: MachineSet, position: MachinePosition, page: Uint8Array) => {
  const time = dateToByte(new Date(set.time))
  const resistance = intToByte(set.resistance * ((set.precision === Precision.dec) ? 10 : 1))
  let repetitions = set.repetitions
  if (set.test) {
    switch (set.test.type) {
      case TestType.power6r:
        repetitions = 254
        break
      case TestType.a4206r:
        repetitions = 253
        break
      case TestType.a42010r:
        repetitions = 252
        break
    }
  }

  let model = intToByte(modelValue)
  let version = intToByte(parseInt(set.version, 16))
  let serialTime = serialStringToByte(set.serial)
  let channel = serialStringToChannelByte(set.serial, set.version, set.precision, set.units)

  page[0] = time[0]
  page[1] = time[1]
  page[2] = time[2]
  page[3] = time[3]
  page[4] = resistance[0]
  page[5] = resistance[1]
  page[6] = repetitions
  page[7] = model[0]
  page[8] = model[1]
  page[9] = version[3]
  page[10] = version[2]
  page[11] = version[1]
  page[12] = version[0]
  page[13] = serialTime[0]
  page[14] = serialTime[1]
  page[15] = serialTime[2]
  page[16] = serialTime[3]
  page[17] = channel

  // To-Do: Check on implementation of set position in extra bits field
  // buildSeatPositionData(position, page)
  // For now we'll fill the space
  page[26] = 0xFF
  page[27] = 0xFF
  page[28] = 0xFF
  page[29] = 0xFF

  if (set.test) {
    buildMachineTestData(set.test, page)
  } else {
    buildMachineNormalData(set, page)
  }
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

const toValue = (value: number) => {
  return (value === 255) ? null : value
}

const toByte = (value: number | null) => {
  return value === null ? 0xFF : value
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
 * Int to Byte Function
 * @param args  Accepts arguments of int
 * @returns     Returns Uint8 values in ascending order of significance (lsb first)
 */
const intToByte = (arg: number) => {
  return [
    (arg & 0x000000FF),
    (arg & 0x0000FF00) >> 8,
    (arg & 0x00FF0000) >> 16,
    (arg & 0xFF000000) >> 24
  ]
}

/**
 * Byte to Date Function
 * @param args  Accepts arguments in ascending order of significance (lsb first)
 * @returns     Returns local offset Date value
 */
const byteToDate = (...args: number[]) => {
  return new Date(byteToInt(...args) * 1000)
}

/**
 * Date to Byte Function
 * @param args  Accepts Date value
 * @returns     Returns bytes in ascending order of significance (lsb first)
 */
const dateToByte = (date: Date) => {
  return intToByte(date.getTime() / 1000)
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

const serialStringToByte = (serial: string) => {
  const segs = (/(\d{2})(\d{2}) (\d{4}) (\d{2})(\d{2}) (\d{2})/).exec(serial)
  if (segs === null || segs.length !== 7) {
    throw new Error('Invalid serial string.')
  }
  const segInts = segs.slice(1).map(seg => parseInt(seg, 10))
  const msOffset = Date.UTC(segInts[2], segInts[0] - 1, segInts[1], segInts[3], segInts[4], segInts[5])
  return intToByte(msOffset / 1000)
}

const serialStringToChannelByte = (serial: string, version: string, precision: Precision, units: ForceUnit) => {
  let channel = 0
  if (unitVersion(version)) {
    channel = parseInt(serial.substr(-2), 10) - 0x20
  } else {
    channel = parseInt(serial.substr(-2), 10)
  }

  if (precision === Precision.dec) {
    channel = channel | 0x80
  }

  switch (units) {
    case ForceUnit.kg:
      channel = channel | 0x20
      break
    case ForceUnit.ne:
      channel = channel | 0x40
      break
    case ForceUnit.er:
      channel = channel | 0x60
      break
  }
  return channel
}

const generateEmptyEChip = (): Uint8Array[] => {
  let data = new Array(256)
  for (let y = 0; y < data.length; y++) {
    data[y] = new Uint8Array(32)
    for (let x = 0; x < data[y].length; x++) {
      if (y > 0 && (y % 32 === 30 || y % 32 === 31)) {
        if (x === data[y].length - 1) {
          data[y][x] = 0xCF
        } else {
          data[y][x] = 0xFF
        }
      } else {
        data[y][x] = 0x55
      }
    }
  }

  return data
}

// const buildSeatPositionData = (position: MachinePosition, page: Uint8Array) => {
//   const seat = (position.seat == null) ? 0xFF : position.seat
//   const rom1 = (position.rom1 == null) ? 0xFF : position.rom1
//   const rom2 = (position.rom2 == null) ? 0xFF : position.rom2
//   const chest = (position.chest == null) ? 0xFF : position.chest

//   page[26] = seat
//   page[27] = rom2
//   page[28] = rom1
//   page[29] = chest
// }

const buildMachineNormalData = (set: MachineSet, page: Uint8Array) => {
  const peak = intToByte(set.peak || 0)
  const work = intToByte((set.work || 0) * 64)
  const distance = intToByte(set.distance || 0)

  page[18] = distance[0]
  page[19] = distance[1]
  page[20] = peak[0]
  page[21] = peak[1]
  page[22] = work[0]
  page[23] = work[1]
  page[24] = work[2]
  page[25] = work[3]

}

const buildMachineTestData = (test: MachineTest, page: Uint8Array) => {
  if (test.low) {
    packData(test.low, 18, page)
  }
  if (test.high) {
    packData(test.high, 24, page)
  }
}

const unpackData = (page: Uint8Array, offset: number) => {
  return {
    power : page[offset] + ((page[offset + 2] & 0x1F) << 8),
    velocity : page[offset + 1] + ((page[offset + 2] & 0xE0) << 3),
    force : page[offset + 3] + ((page[offset + 5] & 0xF0) << 4),
    position : page[offset + 4] + ((page[offset + 5] & 0x0F) << 8)
  } as MachineTestResult
}

const packData = (res: MachineTestResult, offset: number, page: Uint8Array) => {
  page[offset++] = res.power & 0x00FF
  page[offset++] = res.velocity & 0x00FF
  page[offset++] = ((res.power & 0x1F00) >> 8) + ((res.velocity & 0x0700) >> 3)
  page[offset++] = res.force & 0x00FF
  page[offset++] = res.position & 0x00FF
  page[offset++] = ((res.position & 0x0F00) >> 8) + ((res.force & 0x0F00) >> 4)
}

const buildCRC = (data: Uint8Array[]) => {
  data.forEach(page => {
    if (!isEmptyPage(page)) {
      let crc = 0
      for (let x = 0; x < 30; x++) {
        let entry = page[x]
        for (let y = 0; y < 8; y++) {
          let odd = (entry ^ crc) % 2
          crc = crc >> 1
          entry = entry >> 1
          if (odd) {
            crc = crc ^ 0xA001
          }
        }
      }
      let crcValue = intToByte(crc ^ 0xFFFF)
      page[30] = crcValue[0]
      page[31] = crcValue[1]
    }
  })
}
