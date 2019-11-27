import Logger from './logger'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { EChipBuilder, EChipParser, EChipObject, MachineObject, getTzStr, getTzOffset } from './echipLib'
import { Listener, Disposable } from './typedEvent'

export default class EChip extends EChipConnection {
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

  async clearData () {
    let newData = EChipBuilder({})
    try {
      let oldData = (await this.data).rawData
      await this.owDevice.keyWriteDiff(this.echipId, newData, oldData, false)
    } catch (error) {
      await this.owDevice.keyWriteAll(this.echipId, newData, false)
    }
    this.data = new Promise(r => r(EChipParser(newData)))
    // await (this.data = this.loadData())
  }

  async setData (machines: {[index: string]: MachineObject}) {
    let newData = EChipBuilder(machines)
    let oldData = (await this.data).rawData
    await this.owDevice.keyWriteDiff(this.echipId, newData, oldData, false)
    this.data = new Promise(r => r(EChipParser(newData)))
    // await (this.data = this.loadData())
  }

  protected async dispose () {
    await super.dispose()
    Logger.info('EChip disconnected: ' + this.id)
  }

  async setTZOffset () {
    let tzString = getTzStr()
    let tzOffset = getTzOffset()
    console.log(tzOffset)

    let resultTZString = false

    while (!resultTZString) {
      resultTZString = await this.owDevice.writeTZOffset(this.echipId, tzString, 0x00, 0x00)
    }

    let resultTZOffset = false
    while (!resultTZOffset) {
      resultTZOffset = await this.owDevice.writeTZOffset(this.echipId, tzOffset, 0x08, 0x00)
    }

    this.loadData()
  }

  private async loadData () {
    let raw = await this.owDevice.keyReadAll(this.echipId, false)
    let echipData = EChipParser(raw)
    console.log(raw)
    if (!echipData.validStructure) {
      Logger.warn('Invalid Data Structure')
    }
    return echipData
  }
}
