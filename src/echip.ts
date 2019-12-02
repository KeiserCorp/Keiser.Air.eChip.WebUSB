import Logger from './logger'
import OWDevice from './owDevice'
import Chip from './chip'
import { EChipBuilder, EChipParser, EChipObject, MachineObject } from './echipLib'
import { Listener, Disposable } from './typedEvent'

export default class EChip extends Chip {
  private owDevice: OWDevice
  private data: Promise<EChipObject>

  constructor (echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(echipId, owDevice, onDisconnect)
    this.echipId = echipId
    this.owDevice = owDevice
    this.data = this.loadData()
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
