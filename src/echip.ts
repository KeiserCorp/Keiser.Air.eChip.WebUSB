import Logger from './logger'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { Listener, Disposable } from './typedEvent'

export default class EChip extends EChipConnection {
  private echipId: Uint8Array
  private owDevice: OWDevice

  constructor (echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(onDisconnect)
    this.echipId = echipId
    this.owDevice = owDevice
    this.doIt()
  }

  get id () {
    return this.echipId.reduce((s,d) => s += ((d >> 4) & 0x0F).toString(16) + (d & 0x0F).toString(16), '').split('').reverse().join('')
  }

  private async doIt () {
    let data = await this.owDevice.keyReadAll(this.echipId)
    console.log(data)
  }

  protected async dispose () {
    super.dispose()
    Logger.info('EChip disposed.')
  }
}
