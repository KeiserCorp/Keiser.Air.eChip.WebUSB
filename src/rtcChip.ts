import Logger from './logger'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { EChipObject, EChipParser, currentTime } from './echipLib'
import { Listener, Disposable } from './typedEvent'

export default class RTCChip extends EChipConnection {
  private echipId: Uint8Array
  private owDevice: OWDevice
  private start: number
  private data: Promise<EChipObject> | null

  constructor (echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(onDisconnect)
    this.echipId = echipId
    this.owDevice = owDevice
    this.data = null
    this.start = performance.now()
    Logger.info('(RTC) Blue Chip connected: ' + this.id)
  }

  get id () {
    return this.echipId.reduce((s,d) => s += (d & 0x0F).toString(16) + ((d >> 4) & 0x0F).toString(16), '').split('').reverse().join('')
  }

  destroy () {
    this.disconnected()
  }

  async getData () {
    return this.data
  }

  protected async dispose () {
    super.dispose()
    Logger.info('RTC Chip disconnected: ' + this.id)
  }

  async setRTC () {
    let newTime = currentTime()
    await this.owDevice.writeRTC(this.echipId, newTime)

    this.data = this.loadData()

    Logger.info('Finished Write (Time & Date): ' + + Math.round(performance.now() - this.start) + 'ms')
  }

  private async loadData () {
    let raw = await this.owDevice.keyReadAll(this.echipId, false)
    let echipData = EChipParser(raw)
    return echipData
  }

}
