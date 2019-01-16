import Logger from './logger'
import EChip from './echip'
import OWDevice from './owDevice'
import EChipConnection from './echipConnection'
import { TypedEvent, Listener, Disposable } from './typedEvent'

export default class EChipReader extends EChipConnection {
  readonly claimed: Promise<boolean>
  private owDevice: OWDevice
  private onEChipDetectEvent = new TypedEvent<EChip>()
  private onDisconnectEvent = new TypedEvent<null>()

  constructor (usbDevice: USBDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(onDisconnect)
    this.owDevice = new OWDevice(usbDevice, (e: Uint8Array) => this.echipDetected(e))
    this.claimed = this.owDevice.claim()
    Logger.info('EChip Reader connected.')
    this.owDevice.startSearch()
  }

  onDisconnect (listener: Listener<null>) {
    return this.onDisconnectEvent.on(listener)
  }

  onEChipDetect (listener: Listener<EChip>) {
    this.onEChipDetectEvent.on(listener)
  }

  private echipDetected (echipId: Uint8Array) {
    const echip = new EChip(echipId, this.owDevice, (l: Listener<null>) => this.onDisconnect(l))
    this.onEChipDetectEvent.emit(echip)
  }

  protected disconnected () {
    this.onDisconnectEvent.emit(null)
    super.disconnected()
  }

  protected async dispose () {
    await this.owDevice.close()
    super.dispose()
    Logger.info('EChip Reader disconnected.')
  }

}
