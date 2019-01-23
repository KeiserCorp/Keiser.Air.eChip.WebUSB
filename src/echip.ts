import Logger from './logger'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { Listener, Disposable } from './typedEvent'

export default class EChip extends EChipConnection {
  private echipId: Uint8Array
  private owDevice: OWDevice
  private data: Promise<Uint8Array[]>

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

  placeholder () {
    // This function is purely to keep the linter happy becuase owDevice isn't used yet
    this.owDevice.close()
  }

  async getData () {
    return this.data
  }

  protected async dispose () {
    await super.dispose()
    Logger.info('EChip disconnected: ' + this.id)
  }

  private async loadData () {
    const start = performance.now()
    const data = await this.owDevice.keyReadAll(this.echipId, true)
    const end = performance.now()
    Logger.info('Echip read completed in ' + Math.round(end - start) + 'ms')
    return data
  }
}
