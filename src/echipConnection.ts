import { TypedEvent, Listener, Disposable } from './typedEvent'

export class EChipConnection {
  protected disposed: boolean = false
  private onDisconnectListener: Disposable | null = null
  private onDisconnectEvent = new TypedEvent<null>()

  constructor (onDisconnect: (listener: Listener<null>) => Disposable) {
    this.onDisconnectListener = onDisconnect(() => this.disconnected())
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
  }
}
