
import { BaseChip } from './baseChip'
import { OWDevice } from './owDevice'
import { DataChipBuilder, DataChipParser, DataChipObject, MachineObject } from './chipLib'
import { Listener, Disposable } from './typedEvent'
import { TimeoutStrategy, Policy } from 'cockatiel'

const TIMEOUT_INTERVAL = 20000
const RETRY_ATTEMPTS = 2

const timeoutPolicy = Policy.timeout(TIMEOUT_INTERVAL, TimeoutStrategy.Cooperative)
const retryPolicy = Policy.handleAll().retry().attempts(RETRY_ATTEMPTS)

const invalidResultGenerator = () => Promise.resolve({ machineData: {}, rawData: [], validStructure: false } as DataChipObject)
const compareResults = (srcData: Array<Uint8Array>, resData: Array<Uint8Array>) => {
  return srcData.every((page, pageIndex) => page.every((byte, index) => byte === resData[pageIndex][index]))
}

export class DataChip extends BaseChip {
  private data: Promise<DataChipObject>

  constructor (chipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(chipId, owDevice, onDisconnect)
    this.data = this.loadData()
  }

  async getData () {
    return this.data
  }

  async clearData () {
    let newData = DataChipBuilder({})
    await retryPolicy.execute(async () => {
      await timeoutPolicy.execute(async () => this.performClearData(newData))
    })
  }

  private async performClearData (newData: Uint8Array[]) {
    try {
      let oldData = (await this.data).rawData
      await this.owDevice.keyWriteDiff(this.chipId, newData, oldData, false)
    } catch (error) {
      try {
        await this.owDevice.keyWriteAll(this.chipId, newData, false)
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
    let newData = DataChipBuilder(machines)
    await retryPolicy.execute(async () => {
      await timeoutPolicy.execute(async () => this.performSetData(newData))
    })
  }

  async performSetData (newData: Uint8Array[]) {
    let oldData = (await this.data).rawData
    try {
      await this.owDevice.keyWriteDiff(this.chipId, newData, oldData, false)
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

  private async loadData () {
    return retryPolicy.execute(async () => {
      return timeoutPolicy.execute(async () => {
        let raw = await this.owDevice.keyReadAll(this.chipId, false)
        let echipData = DataChipParser(raw)
        if (!echipData.validStructure) {
          throw new Error('Invalid data structure.')
        }
        return echipData
      })
    })
  }
}
