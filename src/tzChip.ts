import Logger from './logger'
import OWDevice from './owDevice'
import Chip from './chip'
import { EChipObject, getTzStr, getTzOffset } from './echipLib'
import { Listener, Disposable } from './typedEvent'

export default class TZChip extends Chip {
  private owDevice: OWDevice
  private start: number
  private data: Promise<EChipObject> | null

  constructor (echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(echipId, owDevice, onDisconnect)
    this.owDevice = owDevice
    this.data = null
    this.start = performance.now()
  }

  async getData () {
    return this.data
  }

  async setTZOffset () {
    let tzString = getTzStr()
    let tzOffset = getTzOffset()

    let resultTZString = false

    while (!resultTZString) {
      resultTZString = await this.owDevice.writeTZOffset(this.echipId, tzString, 0x00, 0x00)
    }

    let resultTZOffset = false
    while (!resultTZOffset) {
      resultTZOffset = await this.owDevice.writeTZOffset(this.echipId, tzOffset, 0x08, 0x00)
    }

    Logger.info('Finished Write (Timezone): ' + Math.round(performance.now() - this.start) + 'ms')
  }

}
