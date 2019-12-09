
import { BaseChip } from './baseChip'
import { OWDevice } from './owDevice'
import { DataChipObject, DataChipBuilder, MachineObject } from './chipLib'
import { TypedEvent, Listener, Disposable } from './typedEvent'
import { TimeoutStrategy, Policy } from 'cockatiel'

const TIMEOUT_INTERVAL = 20000
const RETRY_ATTEMPTS = 2

const timeoutPolicy = Policy.timeout(TIMEOUT_INTERVAL, TimeoutStrategy.Cooperative)
const retryPolicy = Policy.handleAll().retry().attempts(RETRY_ATTEMPTS)

const compareResults = (srcData: Array<Uint8Array>, resData: Array<Uint8Array>) => {
  return srcData.every((page, pageIndex) => page.every((byte, index) => byte === resData[pageIndex][index]))
}

export class DataChip extends BaseChip {
  protected chipData: DataChipObject
  protected onDataEvent = new TypedEvent<DataChipObject>()

  constructor (chipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(chipId, owDevice, onDisconnect)
    this.chipData = new DataChipObject()
    void (async () => this.setChipData(await this.loadData()))()
  }

  get data () {
    return this.chipData
  }

  onData (listener: Listener<DataChipObject>) {
    return this.onDataEvent.on(listener)
  }

  protected setChipData (data: DataChipObject) {
    this.chipData = data
    this.onDataEvent.emit(data)
  }

  async clearData () {
    await this.setData({})
  }

  async setData (machines: { [index: string]: MachineObject }) {
    let newData = DataChipBuilder(machines)
    await retryPolicy.execute(async () => {
      await timeoutPolicy.execute(async () => {
        let oldData = this.data.rawData
        try {
          await this.owDevice.dataChipWriteDiff(this.chipId, newData, oldData, false)
        } catch (error) {
          try {
            await this.owDevice.dataChipWriteAll(this.chipId, newData, false)
          } catch (error) {
            this.setChipData(new DataChipObject())
            throw error
          }
        }
        this.setChipData(await this.loadData())
        const resultsMatch = compareResults(newData, this.data.rawData)
        if (!resultsMatch) {
          throw new Error('Write was unsuccesful. Data targets do not match.')
        }
      })
    })
  }

  private async loadData () {
    return retryPolicy.execute(async () => {
      return timeoutPolicy.execute(async () => {
        const raw = await this.owDevice.dataChipReadAll(this.chipId, false)
        const chipData = new DataChipObject(raw)
        if (!chipData.validStructure) {
          throw new Error('Invalid data structure.')
        }
        return chipData
      })
    })
  }
}
