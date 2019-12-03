import { OWDevice } from './owDevice'
import { BaseChip } from './baseChip'
import { ChipObject, getCurrentTimeArray, ChipType } from './chipLib'
import { Listener, Disposable } from './typedEvent'
import { TimeoutStrategy, Policy } from 'cockatiel'

const TIMEOUT_INTERVAL = 2000
const RETRY_ATTEMPTS = 2

const timeoutPolicy = Policy.timeout(TIMEOUT_INTERVAL, TimeoutStrategy.Cooperative)
const retryPolicy = Policy.handleAll().retry().attempts(RETRY_ATTEMPTS)

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
    return retryPolicy.execute(async () => {
      return timeoutPolicy.execute(async () => {
        await this.owDevice.rtcChipWrite(this.chipId, getCurrentTimeArray())
        return new ChipObject(ChipType.rtcChip)
      })
    })
  }
}
