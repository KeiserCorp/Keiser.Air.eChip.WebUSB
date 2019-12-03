import { OWDevice } from './owDevice'
import { BaseChip } from './baseChip'
import { ChipObject, getTzOffset, ChipType } from './chipLib'
import { Listener, Disposable } from './typedEvent'

const getTzStr = () => {
  return new Uint8Array('timezone'.split('').map(t => t.charCodeAt(0)))
}

export class TZChip extends BaseChip {
  private data: Promise<ChipObject>

  constructor (chipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(chipId, owDevice, onDisconnect)
    this.data = this.setTZOffset()
  }

  async getData () {
    return this.data
  }

  async setTZOffset () {
    const tzString = getTzStr()
    const tzOffset = getTzOffset()

    let resultTZString = false

    while (!resultTZString) {
      resultTZString = await this.owDevice.writeTZOffset(this.chipId, tzString, 0x00, 0x00)
    }

    let resultTZOffset = false
    while (!resultTZOffset) {
      resultTZOffset = await this.owDevice.writeTZOffset(this.chipId, tzOffset, 0x08, 0x00)
    }

    return new ChipObject(ChipType.tzChip)
  }

}
