const isEmptyPage = (page: Uint8Array) => {
  return page.every(byte => byte === 0x55)
}

const crc16 = (page: Uint8Array) => {
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
  return crc
}

const isValidData = (data: Uint8Array[]) => {
  return data.every(page => {
    if (!isEmptyPage(page)) {
      return crc16(page) === 0xB001
    }
    return true
  })
}

export default function (data: Uint8Array[]) {
  if (!isValidData(data)) {
    throw new Error('Data structure failed CRC check')
  }

  return data
}
