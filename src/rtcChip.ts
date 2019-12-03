import { OWDevice } from './owDevice'
import { BaseChip } from './baseChip'
import { ChipObject, getCurrentTimeArray, ChipType } from './chipLib'
import { Listener, Disposable } from './typedEvent'

export class RTCChip extends BaseChip {
  private data: Promise<ChipObject>

  constructor (chipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(chipId, owDevice, onDisconnect)
    this.data = this.setRTC()
  }

  async getData () {
    return this.data
  }

  async setRTC () {
    await this.owDevice.writeRTC(this.chipId, getCurrentTimeArray())
    return new ChipObject(ChipType.rtcChip)
  }
}
