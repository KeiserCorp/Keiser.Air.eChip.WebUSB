import WebUSBDevice from './webUsbDevice'
// import EChip from './echip'
// import Logger from './logger'
// import { TypedEvent, Listener } from './typedEvent'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

export default class EChipReader extends WebUSBDevice {
  constructor () {
    super(ECHIP_READER_VENDOR_ID, ECHIP_READER_PRODUCT_ID)
  }
}
