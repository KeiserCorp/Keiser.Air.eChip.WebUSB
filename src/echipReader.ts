import WebUSBDevice from './webUsbDevice'
// import EChip from './echip'
import Logger from './logger'
// import { TypedEvent, Listener } from './typedEvent'

const ECHIP_READER_VENDOR_ID = 0x04FA
const ECHIP_READER_PRODUCT_ID = 0x2490

export default class EChipReader extends WebUSBDevice {
  constructor () {
    super(ECHIP_READER_VENDOR_ID, ECHIP_READER_PRODUCT_ID)
  }

  protected async connected (device: USBDevice) {
    await super.connected(device)
    Logger.info('USB Device connected.')
    this.mapEndpoints()
  }

  protected async disconnected () {
    await super.disconnected()
    Logger.info('USB Device disconnected.')
  }

  private mapEndpoints () {
    // Maybe this comes from a nexted class where `targetDevice` is always present?
    if (this.targetDevice) {
      this.targetDevice.configurations.forEach(configuration => {
        configuration.interfaces.forEach(usbInterface => {
          usbInterface.alternates.forEach(alternate => {
            alternate.endpoints.forEach(endpoint => {
            // if (endpoint.direction === 'in' && endpoint.type === 'bulk') {
            //   targetConfiguration = configuration
            //   targetInterface = usbInterface
            //   this.bulkInEndpoint = endpoint
            // }
            })
          })
        })
      })
    }
  }
}
