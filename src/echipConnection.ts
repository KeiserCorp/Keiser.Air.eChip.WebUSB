import { Listener, Disposable } from './typedEvent'

export default class EChipConnection {
  protected disposed: boolean = false
  private onDisconnectListener: Disposable | null = null

  constructor (onDisconnect: (listener: Listener<null>) => Disposable) {
    this.onDisconnectListener = onDisconnect(() => this.disconnected())
  }

  get diposed () {
    return this.disposed
  }

  protected disconnected () {
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
