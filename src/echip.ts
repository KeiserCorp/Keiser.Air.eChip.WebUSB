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
    Logger.info('EChip detected: ' + this.id)
  }

  get id () {
    return this.echipId.reduce((s,d) => s += ((d >> 4) & 0x0F).toString(16) + (d & 0x0F).toString(16), '').split('').reverse().join('')
  }

  destroy () {
    this.disconnected()
  }

  placeholder () {
    // This function is purely to keep the linter happy becuase owDevice isn't used yet
    this.owDevice.close()
  }

  protected async dispose () {
    await super.dispose()
    Logger.info('EChip disposed: ' + this.id)
  }
}
