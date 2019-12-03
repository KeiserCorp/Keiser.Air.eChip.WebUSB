import { OWDevice } from './owDevice'
import { BaseChip } from './baseChip'
import { getCurrentTimeArray } from './chipLib'
import { Listener, Disposable } from './typedEvent'

export class RTCChip extends BaseChip {
  private set: Promise<boolean>

  constructor (chipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(chipId, owDevice, onDisconnect)
    this.set = this.setRTC()
  }

  async isSet () {
    return this.set
  }

  async setRTC () {
    await this.owDevice.writeRTC(this.chipId, getCurrentTimeArray())
    return true
  }
}
