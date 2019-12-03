import { Logger } from './logger'
import { Chip, DataChip, RTCChip, TZChip, BaseChip } from './chips'
import { OWDevice } from './owDevice'
import { getChipType, ChipType } from './chipLib'
import { TypedEvent, Listener, Disposable } from './typedEvent'

export class ChipReader {
  readonly claimed: Promise<boolean>
  private disposed: boolean = false
  private onDisconnectListener: Disposable | null = null
  private usbDevice: WebUSBDevice
  private owDevice: OWDevice
  private onChipDetectEvent = new TypedEvent<Chip>()
  private onDisconnectEvent = new TypedEvent<null>()
  private activeKeys: Map<string,Chip> = new Map()

  constructor (usbDevice: WebUSBDevice, onDisconnect: (listener: Listener<WebUSBDevice>) => Disposable) {
    this.onDisconnectListener = onDisconnect((device: WebUSBDevice) => this.disconnected(device))
    this.usbDevice = usbDevice
    this.owDevice = new OWDevice(usbDevice, (e: Array<Uint8Array>) => this.chipsDetected(e))
    this.claimed = this.owDevice.claim().then(() => {
      Logger.info('Chip Reader connected.')
      void this.owDevice.startSearch()
      return true
    })
  }
  get diposed () {
    return this.disposed
  }

  onDisconnect (listener: Listener<null>) {
    return this.onDisconnectEvent.on(listener)
  }

  onChipDetect (listener: Listener<Chip>) {
    return this.onChipDetectEvent.on(listener)
  }

  private chipsDetected (chipIds: Array<Uint8Array>) {
    let validIds: Array<string> = []
    chipIds.forEach(chipId => {
      const chipIdString = chipId.join()
      validIds.push(chipIdString)

      const chipType = getChipType(parseInt(validIds[0].substring(0,2), 10))

      if (!this.activeKeys.has(chipIdString)) {

        let chip: Chip
        const onDisconnectCallback = (l: Listener<null>) => this.onDisconnect(l)
        switch (chipType) {
          case ChipType.dataChip:
            chip = new DataChip(chipId, this.owDevice, onDisconnectCallback)
            break
          case ChipType.rtcChip:
            chip = new RTCChip(chipId, this.owDevice, onDisconnectCallback)
            break
          case ChipType.tzChip:
            chip = new TZChip(chipId, this.owDevice, onDisconnectCallback)
            break
          default:
            chip = new BaseChip(chipId, this.owDevice, onDisconnectCallback)
        }
        this.activeKeys.set(chipIdString, chip)
        this.onChipDetectEvent.emit(chip)
      }
    })

    this.activeKeys.forEach((chip, chipIdString) => {
      if (!validIds.includes(chipIdString)) {
        chip.destroy()
        this.activeKeys.delete(chipIdString)
      }
    })
  }

  protected disconnected (device: WebUSBDevice) {
    if (this.usbDevice === device) {
      this.onDisconnectEvent.emit(null)
      void this.dispose()
    }
  }

  protected async dispose () {
    await this.owDevice.close()
    if (this.onDisconnectListener) {
      this.onDisconnectListener.dispose()
      this.onDisconnectListener = null
    }
    this.disposed = true
    Logger.info('Chip Reader disconnected.')
  }

}