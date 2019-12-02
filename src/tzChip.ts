import Logger from './logger'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { EChipObject, EChipParser, getTzStr, getTzOffset } from './echipLib'
import { Listener, Disposable } from './typedEvent'

export default class TZChip extends EChipConnection {
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
    Logger.info('(Timezone) Green Chip connected: ' + this.id)

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
    Logger.info('(Timezone) Green Chip disconnected: ' + this.id)
  }

  async setTZOffset () {
    let tzString = getTzStr()
    let tzOffset = getTzOffset()

    let resultTZString = false

    while (!resultTZString) {
      resultTZString = await this.owDevice.writeTZOffset(this.echipId, tzString, 0x00, 0x00)
    }

    let resultTZOffset = false
    while (!resultTZOffset) {
      resultTZOffset = await this.owDevice.writeTZOffset(this.echipId, tzOffset, 0x08, 0x00)
    }
    Logger.info('Finished Write (Timezone): ' + + Math.round(performance.now() - this.start) + 'ms')
    this.data = this.loadData()
  }

  private async loadData () {
    let raw = await this.owDevice.keyReadAll(this.echipId, false)
    let echipData = EChipParser(raw)

    return echipData
  }

}
