import Logger from './logger'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { EChipObject, EChipParser, getTzStr, getTzOffset } from './echipLib'
import { Listener, Disposable } from './typedEvent'

export default class TZChip extends EChipConnection {
  private echipId: Uint8Array
  private owDevice: OWDevice
  private data: Promise<EChipObject>

  constructor (echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(onDisconnect)
    this.echipId = echipId
    this.owDevice = owDevice
    this.data = this.loadData()
    Logger.info('EChip connected: ' + this.id)
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
    Logger.info('EChip disconnected: ' + this.id)
  }

  async setTZOffset () {
    let tzString = getTzStr()
    let tzOffset = getTzOffset()
    await this.owDevice.writeTZOffset(this.echipId, tzString, 0x00, 0x00)
    await this.owDevice.writeTZOffset(this.echipId, tzOffset, 0x08, 0x00)
  }

  private async loadData () {
    let raw = await this.owDevice.keyReadAll(this.echipId, false)
    let echipData = EChipParser(raw)
    console.log(raw)

    return echipData
  }

}
