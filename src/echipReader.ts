import Logger from './logger'
import EChip from './echip'
import RTCChip from './rtcChip'
import TZChip from './tzChip'
import OWDevice from './owDevice'
import { TypedEvent, Listener, Disposable } from './typedEvent'

export default class EChipReader {
  readonly claimed: Promise<boolean>
  private disposed: boolean = false
  private onDisconnectListener: Disposable | null = null
  private usbDevice: WebUSBDevice
  private owDevice: OWDevice
  private onEChipDetectEvent = new TypedEvent<EChip>()
  // private onTZChipDetectEvent = new TypedEvent<TZChip>()
  // private onRTCChipDetectEvent = new TypedEvent<RTCChip>()
  private onDisconnectEvent = new TypedEvent<null>()
  private activeKeys: Map<string,EChip> = new Map()

  constructor (usbDevice: WebUSBDevice, onDisconnect: (listener: Listener<WebUSBDevice>) => Disposable) {
    this.onDisconnectListener = onDisconnect((device: WebUSBDevice) => this.disconnected(device))
    this.usbDevice = usbDevice
    this.owDevice = new OWDevice(usbDevice, (e: Array<Uint8Array>) => this.echipsDetected(e))
    this.claimed = this.owDevice.claim().then(() => {
      Logger.info('EChip Reader connected.')
      this.owDevice.startSearch()
      return true
    })
  }
  get diposed () {
    return this.disposed
  }

  onDisconnect (listener: Listener<null>) {
    return this.onDisconnectEvent.on(listener)
  }

  onEChipDetect (listener: Listener<EChip>) {
    this.onEChipDetectEvent.on(listener)
  }

  // onTZChipDetect (listener: Listener<TZChip>) {
  //   this.onTZChipDetectEvent.on(listener)
  // }

  // onRTCChipDetect (listener: Listener<RTCChip>) {
  //   this.onRTCChipDetectEvent.on(listener)
  // }

  private echipsDetected (echipIds: Array<Uint8Array>) {
    let validIds: Array<string> = []
    echipIds.forEach(echipId => {
      let echipIdString = echipId.join()
      validIds.push(echipIdString)

      let echipType = parseInt(validIds[0].substring(0,2), 10)

      if (!this.activeKeys.has(echipIdString)) {

        let echip: any
        switch (echipType) {
          case 45:
            echip = new EChip(echipId, this.owDevice, (l: Listener<null>) => this.onDisconnect(l))
            this.activeKeys.set(echipIdString, echip)
            this.onEChipDetectEvent.emit(echip)
            break
          case 36:
            echip = new RTCChip(echipId, this.owDevice, (l: Listener<null>) => this.onDisconnect(l))
            this.activeKeys.set(echipIdString, echip)
            this.onEChipDetectEvent.emit(echip)
            break
          case 12:
            echip = new TZChip(echipId, this.owDevice, (l: Listener<null>) => this.onDisconnect(l))
            this.activeKeys.set(echipIdString, echip)
            this.onEChipDetectEvent.emit(echip)
            break
        }
      }
    })

    this.activeKeys.forEach((echip, echipIdString) => {
      if (!validIds.includes(echipIdString)) {
        echip.destroy()
        this.activeKeys.delete(echipIdString)
      }
    })
  }

  protected disconnected (device: WebUSBDevice) {
    if (this.usbDevice === device) {
      this.onDisconnectEvent.emit(null)
      this.dispose()
    }
  }

  protected async dispose () {
    await this.owDevice.close()
    if (this.onDisconnectListener) {
      this.onDisconnectListener.dispose()
      this.onDisconnectListener = null
    }
    this.disposed = true
    Logger.info('EChip Reader disconnected.')
  }

}
