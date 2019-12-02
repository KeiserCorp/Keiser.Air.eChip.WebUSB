import { Logger } from './logger'
import { OWDevice } from './owDevice'
import { EChipConnection } from './echipConnection'
import { EChipBuilder, EChipParser, EChipObject, MachineObject } from './echipLib'
import { Listener, Disposable } from './typedEvent'

const invalidResultGenerator = () => Promise.resolve({ machineData: {}, rawData: [], validStructure: false } as EChipObject)
const compareResults = (srcData: Array<Uint8Array>, resData: Array<Uint8Array>) => {
  return srcData.every((page, pageIndex) => page.every((byte, index) => byte === resData[pageIndex][index]))
}

export class EChip extends EChipConnection {
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
      console.warn('Clear diff write failed. Retrying using full write.')
      try {
        await this.owDevice.keyWriteAll(this.echipId, newData, false)
      } catch (error) {
        this.data = invalidResultGenerator()
        throw error
      }
    }
    await (this.data = this.loadData())
    const resultsMatch = compareResults(newData, (await this.data).rawData)
    if (!resultsMatch) {
      throw new Error('Write was unsuccesful. Data targets do not match.')
    }
  }

  async setData (machines: { [index: string]: MachineObject }) {
    let newData = EChipBuilder(machines)
    let oldData = (await this.data).rawData
    try {
      await this.owDevice.keyWriteDiff(this.echipId, newData, oldData, false)
    } catch (error) {
      this.data = invalidResultGenerator()
      throw error
    }
    await (this.data = this.loadData())
    const resultsMatch = compareResults(newData, (await this.data).rawData)
    if (!resultsMatch) {
      throw new Error('Write was unsuccesful. Data targets do not match.')
    }
  }

  protected dispose () {
    super.dispose()
    Logger.info('EChip disconnected: ' + this.id)
  }

  private async loadData () {
    let raw = await this.owDevice.keyReadAll(this.echipId, false)
    let echipData = EChipParser(raw)
    if (!echipData.validStructure) {
      Logger.warn('Invalid Data Structure')
    }
    return echipData
  }
}
