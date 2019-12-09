import { Logger } from './logger'
import { OWDevice } from './owDevice'
import { ChipType, getChipType, getChipLabel, ChipObject } from './chipLib'
import { TypedEvent, Listener, Disposable } from './typedEvent'

export class BaseChip {
  protected chipData: ChipObject
  protected chipId: Uint8Array
  protected owDevice: OWDevice
  private chipType: ChipType
  private disposed: boolean = false
  private onDisconnectListener: Disposable | null = null
  private onDisconnectEvent = new TypedEvent<null>()
  protected _onDataEvent = new TypedEvent<ChipObject>()

  constructor (chipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    this.chipId = chipId
    this.owDevice = owDevice
    this.chipType = getChipType(this.chipId[0])
    this.chipData = new ChipObject(this.chipType)
    this.onDisconnectListener = onDisconnect(() => this.disconnected())

    Logger.info(`${getChipLabel(this.type)} connected: ${this.id}`)
  }

  get data () {
    return this.chipData
  }

  get diposed () {
    return this.disposed
  }

  onData (listener: Listener<ChipObject>) {
    return this._onDataEvent.on(listener)
  }

  protected setChipData (data: ChipObject) {
    this.chipData = data
    this._onDataEvent.emit(data)
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
