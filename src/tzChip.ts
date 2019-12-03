import { OWDevice } from './owDevice'
import { BaseChip } from './baseChip'
import { getTzOffset } from './chipLib'
import { Listener, Disposable } from './typedEvent'

const getTzStr = () => {
  return new Uint8Array('timezone'.split('').map(t => t.charCodeAt(0)))
}

export class TZChip extends BaseChip {
  private set: Promise<boolean>

  constructor (chipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(chipId, owDevice, onDisconnect)
    this.set = this.setTZOffset()
  }

  async isSet () {
    return this.set
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

    return true
  }

}
