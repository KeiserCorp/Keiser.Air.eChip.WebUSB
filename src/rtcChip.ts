import Logger from './logger'
import OWDevice from './owDevice'
import Chip from './chip'
import { EChipObject, currentTime } from './echipLib'
import { Listener, Disposable } from './typedEvent'

export default class RTCChip extends Chip {
  private owDevice: OWDevice
  private start: number
  private data: Promise<EChipObject> | null

  constructor (echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(echipId, owDevice, onDisconnect)
    this.echipId = echipId
    this.owDevice = owDevice
    this.data = null
    this.start = performance.now()
  }

  async getData () {
    return this.data
  }

  async setRTC () {
    let newTime = currentTime()
    await this.owDevice.writeRTC(this.echipId, newTime)

    Logger.info('Finished Write (Time & Date): ' + + Math.round(performance.now() - this.start) + 'ms')
    this.finished()
  }

}
