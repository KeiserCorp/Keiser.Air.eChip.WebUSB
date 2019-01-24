interface EChipObject {
  position: {
    chest: number | null
    rom2: number | null
    rom1: number | null
    seat: number | null
  }
}

export default function (data: Uint8Array[]) {
  if (!isValidData(data)) {
    throw new Error('Data structure failed CRC check')
  }

  return data
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
  let echipObject: { [index: string]: EChipObject } = {}
  for (let y = 1; y <= 8; y++) {
    for (let x = 0; x < 3; x++) {
      let pageOffset = (y * 32) - 2
      let bufferOffset = x * 10
      if (data[pageOffset][bufferOffset] === 1) {
        let model = byteToString(data[pageOffset][bufferOffset + 1], data[pageOffset][bufferOffset + 2])
        echipObject[model] = {
          position: {
            chest: valueOrNull(data[pageOffset][bufferOffset + 3]),
            rom2: valueOrNull(data[pageOffset][bufferOffset + 4]),
            rom1: valueOrNull(data[pageOffset][bufferOffset + 5]),
            seat: valueOrNull(data[pageOffset][bufferOffset + 6])
          }
        }
        let firstPage = data[pageOffset][bufferOffset + 7]
        // parseMachineSet(data, eChipObject[model], firstPage)
      }
    }
  }
  return echipObject
}

const parseMachineSet = (data, machineObject, page) =>  {
  let fatBuffer = (Math.floor(page / 32) * 32) + 31
  let fatBufferOffset = (page % 30)
  let nextPage = data[fatBuffer][fatBufferOffset]
  let dataPage = data[page]

  let set = {}
  set.model = byteToString(dataPage[7], dataPage[8])
  set.version = byteToLongString(dataPage[12], dataPage[11], dataPage[10], dataPage[9])
  set.serial = byteToSerialString(dataPage[13], dataPage[14], dataPage[15], dataPage[16], dataPage[17], set.version)
  set.time = moment(byteToTime(dataPage[0], dataPage[1], dataPage[2], dataPage[3])).format()
  set.resistance = byteToWord(dataPage[4], dataPage[5])
  set.precision = PRECISION.INTEGER
  set.units = null
  set.repetitions = dataPage[6]

  if (unitVersion(set.version)) {
    if ((dataPage[17] & 0x80) === 0x80) {
      set.resistance = set.resistance / 10
      set.precision = PRECISION.DECIMAL
    }

    switch (dataPage[17] & 0x60) {
      case 0x00:
        set.units = FORCE.LB
        break
      case 0x20:
        set.units = FORCE.KG
        break
      case 0x40:
        set.units = FORCE.NE
        break
      case 0x60:
        set.units = FORCE.ER
        break
    }
  }

  if (testVersion(set.version)) {
    if (set.repetitions <= 254 && set.repetitions >= 252) {
      set.test = {}
      switch (set.repetitions) {
        case 254:
          set.test.type = POWER_TEST
          set.test.low = decodePackData(dataPage, 18)
          set.test.high = decodePackData(dataPage, 24)
          set.repetitions = 6
          break
        case 253:
          set.test.type = A420_6R_TEST
          set.repetitions = 6
          break
        case 252:
          set.test.type = A420_10R_TEST
          set.repetitions = 10
          break
      }
    } else {
      if (peakPowerVersion(set.version)) {
        set.peak = byteToWord(dataPage[20], dataPage[21])
        set.work = Math.round(byteToLongWord(dataPage[22], dataPage[23], dataPage[24], dataPage[25]) / 64)
        // set.work = byteToLongWord(dataPage[22], dataPage[23], dataPage[24], dataPage[25]) / 64;

        if ((parseInt(set.model, 16) & 0xFF00) === 0x3200) {
          set.distance = byteToWord(dataPage[18], dataPage[19])
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

const valueOrNull = (value: number) => {
  return (value === 255) ? null : value
}

const byteToString = (lsb: number, msb: number) => {
  return ('0000' + (msb.toString(16) + lsb.toString(16))).substr(-4).toUpperCase()
}
