import { Logger } from './logger'
import { OWDevice } from './owDevice'
import { ChipType, getChipType, getChipLabel } from './chipLib'
import { TypedEvent, Listener, Disposable } from './typedEvent'

export class BaseChip {
  protected chipId: Uint8Array
  protected owDevice: OWDevice
  private chipType: ChipType
  private disposed: boolean = false
  private onDisconnectListener: Disposable | null = null
  private onDisconnectEvent = new TypedEvent<null>()

  constructor (chipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    this.chipId = chipId
    this.owDevice = owDevice
    this.chipType = getChipType(this.chipId[0])
    this.onDisconnectListener = onDisconnect(() => this.disconnected())

    Logger.info(`${getChipLabel(this.type)} connected: ${this.id}`)
  }

  get diposed () {
    return this.disposed
  }

  onDisconnect (listener: Listener<null>) {
    return this.onDisconnectEvent.on(listener)
  }

  protected disconnected () {
    this.onDisconnectEvent.emit(null)
    this.dispose()
  }

  protected dispose () {
    if (this.onDisconnectListener) {
      this.onDisconnectListener.dispose()
      this.onDisconnectListener = null
    }
    this.disposed = true

    Logger.info(`${getChipLabel(this.type)} disconnected: ${this.id}`)
  }

  get id () {
    return this.chipId.reduce((s,d) => s += (d & 0x0F).toString(16) + ((d >> 4) & 0x0F).toString(16), '').split('').reverse().join('')
  }

  get type () {
    return this.chipType
  }

  destroy () {
    this.disconnected()
  }
}
