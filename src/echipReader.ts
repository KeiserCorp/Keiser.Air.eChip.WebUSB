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
  private activeKeys: Map<string,EChip> = new Map()

  constructor (usbDevice: USBDevice, onDisconnect: (listener: Listener<null>) => Disposable) {
    super(onDisconnect)
    this.owDevice = new OWDevice(usbDevice, (e: Array<Uint8Array>) => this.echipsDetected(e))
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

  private echipsDetected (echipIds: Array<Uint8Array>) {
    let validIds: Array<string> = []
    echipIds.forEach(echipId => {
      let echipIdString = echipId.join()
      validIds.push(echipIdString)
      if (!this.activeKeys.has(echipIdString)) {
        let echip = new EChip(echipId, this.owDevice, (l: Listener<null>) => this.onDisconnect(l))
        this.activeKeys.set(echipIdString, echip)
        this.onEChipDetectEvent.emit(echip)
      }
    })

    this.activeKeys.forEach((echip, echipIdString) => {
      if (!validIds.includes(echipIdString)) {
        echip.destroy()
        this.activeKeys.delete(echipIdString)
      }
    })
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
