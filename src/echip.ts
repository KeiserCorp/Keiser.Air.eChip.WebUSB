
import Chip from './chip'
import { Logger } from './logger'
import { OWDevice } from './owDevice'
import { EChipBuilder, EChipParser, EChipObject, MachineObject } from './echipLib'
import { Listener, Disposable } from './typedEvent'
import { TimeoutStrategy, Policy } from 'cockatiel'

const TIMEOUT_INTERVAL = 20000
const RETRY_ATTEMPTS = 2

const timeoutPolicy = Policy.timeout(TIMEOUT_INTERVAL, TimeoutStrategy.Cooperative)
const retryPolicy = Policy.handleAll().retry().attempts(RETRY_ATTEMPTS)

const invalidResultGenerator = () => Promise.resolve({ machineData: {}, rawData: [], validStructure: false } as EChipObject)
const compareResults = (srcData: Array<Uint8Array>, resData: Array<Uint8Array>) => {
  return srcData.every((page, pageIndex) => page.every((byte, index) => byte === resData[pageIndex][index]))
}

export class EChip extends Chip {
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
    await retryPolicy.execute(async () => {
      await timeoutPolicy.execute(async () => this.performClearData(newData))
    })
  }

  private async performClearData (newData: Uint8Array[]) {
    try {
      let oldData = (await this.data).rawData
      await this.owDevice.keyWriteDiff(this.echipId, newData, oldData, false)
    } catch (error) {
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
    await retryPolicy.execute(async () => {
      await timeoutPolicy.execute(async () => this.performSetData(newData))
    })
  }

  async performSetData (newData: Uint8Array[]) {
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

  private async loadData () {
    return retryPolicy.execute(async () => {
      return timeoutPolicy.execute(async () => {
        let raw = await this.owDevice.keyReadAll(this.echipId, false)
        let echipData = EChipParser(raw)
        if (!echipData.validStructure) {
          throw new Error('Invalid data structure.')
        }
        return echipData
      })
    })
  }
}
