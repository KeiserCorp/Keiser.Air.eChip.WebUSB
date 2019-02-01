import Logger from './logger'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { EChipBuilder, EChipParser, EChipObject, MachineObject } from './echipLib'
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
    let oldData = (await this.data).rawData
    return this.owDevice.keyWriteDiff(this.echipId, newData, oldData, false)
  }

  async setData (machines: {[index: string]: MachineObject}) {
    let newData = EChipBuilder(machines)
    let oldData = (await this.data).rawData
    return this.owDevice.keyWriteDiff(this.echipId, newData, oldData, false)
  }

  protected async dispose () {
    await super.dispose()
    Logger.info('EChip disconnected: ' + this.id)
  }

  private async loadData () {
    let raw = await this.owDevice.keyReadAll(this.echipId, false)
    return EChipParser(raw)
  }
}
