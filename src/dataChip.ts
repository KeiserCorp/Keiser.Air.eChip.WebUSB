
import { BaseChip } from './baseChip'
import { OWDevice } from './owDevice'
import { DataChipObject, DataChipBuilder, MachineObject } from './chipLib'
import { Listener, Disposable } from './typedEvent'
import { TimeoutStrategy, Policy } from 'cockatiel'

const TIMEOUT_INTERVAL = 20000
const RETRY_ATTEMPTS = 2

const timeoutPolicy = Policy.timeout(TIMEOUT_INTERVAL, TimeoutStrategy.Cooperative)
const retryPolicy = Policy.handleAll().retry().attempts(RETRY_ATTEMPTS)

const invalidResultGenerator = () => Promise.resolve(new DataChipObject())
const compareResults = (srcData: Array<Uint8Array>, resData: Array<Uint8Array>) => {
  return srcData.every((page, pageIndex) => page.every((byte, index) => byte === resData[pageIndex][index]))
}

export class DataChip extends BaseChip {
  protected data: Promise<DataChipObject>

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
        const raw = await this.owDevice.keyReadAll(this.chipId, false)
        const chipData = new DataChipObject(raw)
        if (!chipData.validStructure) {
          throw new Error('Invalid data structure.')
        }
        return chipData
      })
    })
  }
}
