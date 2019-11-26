import Logger from './logger'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { EChipObject, EChipParser, currentTime } from './echipLib'
import { Listener, Disposable } from './typedEvent'

export default class RTCChip extends EChipConnection {
  private echipId: Uint8Array
  private owDevice: OWDevice
  private data: Promise<EChipObject>

  constructor (echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(onDisconnect)
    this.echipId = echipId
    this.owDevice = owDevice
    this.data = this.loadData()
    Logger.info('EChip connected: ' + this.id)

    try {
      this.setRTC()
    } catch (error) {
      Logger.info(error)
    }

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
    await super.dispose()
    Logger.info('EChip disconnected: ' + this.id)
  }

  async setRTC () {
    let newTime = currentTime()
    await this.owDevice.writeRTC(this.echipId, newTime)
  }

  private async loadData () {
    let raw = await this.owDevice.keyReadAll(this.echipId, false)
    let echipData = EChipParser(raw)
    return echipData
  }

}
