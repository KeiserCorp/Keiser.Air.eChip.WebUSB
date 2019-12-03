import { Logger } from './logger'
import { OWDevice } from './owDevice'
import { ChipConnection } from './chipConnection'
import { ChipType, getChipType, getChipLabel } from './chipLib'
import { Listener, Disposable } from './typedEvent'

export class BaseChip extends ChipConnection {
  protected chipId: Uint8Array
  protected owDevice: OWDevice
  private type: ChipType

  constructor (chipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(onDisconnect)
    this.chipId = chipId
    this.owDevice = owDevice
    this.type = getChipType(this.chipId[0])

    Logger.info(`${getChipLabel(this.type)} connected: ${this.id}`)
  }

  get id () {
    return this.chipId.reduce((s,d) => s += (d & 0x0F).toString(16) + ((d >> 4) & 0x0F).toString(16), '').split('').reverse().join('')
  }

  destroy () {
    this.disconnected()
  }

  protected async dispose () {
    super.dispose()
    Logger.info(`${getChipLabel(this.type)} disconnected: ${this.id}`)
  }
}
