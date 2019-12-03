import { OWDevice } from './owDevice'
import { BaseChip } from './baseChip'
import { ChipObject, getTzOffset, ChipType } from './chipLib'
import { Listener, Disposable } from './typedEvent'
import { TimeoutStrategy, Policy } from 'cockatiel'

const TIMEOUT_INTERVAL = 2000
const RETRY_ATTEMPTS = 2

const timeoutPolicy = Policy.timeout(TIMEOUT_INTERVAL, TimeoutStrategy.Cooperative)
const retryPolicy = Policy.handleAll().retry().attempts(RETRY_ATTEMPTS)

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
    return retryPolicy.execute(async () => {
      return timeoutPolicy.execute(async () => {
        await this.owDevice.tzChipWrite(this.chipId, getTzStr(), getTzOffset())
        return new ChipObject(ChipType.tzChip)
      })
    })
  }

}
