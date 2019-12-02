import Logger from './logger'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { Listener, Disposable, TypedEvent } from './typedEvent'

export default class Chip extends EChipConnection {
  echipId: Uint8Array
  private type: number
  private onWriteFinishedEvent = new TypedEvent<null>()

  constructor (echipId: Uint8Array, owDevice: OWDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(onDisconnect)
    this.echipId = echipId
    this.type = this.chipType()

    switch (this.type) {
      case 12: Logger.info('EChip connected: ' + this.id)
        break
      case 36: Logger.info('(Time & Date) Blue Chip connected: ' + this.id)
        break
      case 45: Logger.info('(Timezone) Green Chip connected: ' + this.id)
    }
  }

  chipType () {
    return this.echipId[0]
  }

  get id () {
    return this.echipId.reduce((s,d) => s += (d & 0x0F).toString(16) + ((d >> 4) & 0x0F).toString(16), '').split('').reverse().join('')
  }

  destroy () {
    this.disconnected()
  }

  onWriteFinished (listener: Listener<null>) {
    return this.onWriteFinishedEvent.on(listener)
  }

  protected finished () {
    this.onWriteFinishedEvent.emit(null)
  }

  protected async dispose () {
    super.dispose()
    switch (this.type) {
      case 12: Logger.info('EChip disconnected: ' + this.id)
        break
      case 36: Logger.info('(Time & Date) Blue Chip disconnected: ' + this.id)
        break
      case 45: Logger.info('(Timezone) Green Chip disconnected: ' + this.id)
    }
  }
}
