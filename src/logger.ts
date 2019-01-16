export default class Logger {
  static info (message?: any) {
    if (this.enabled()) {
      console.info(message)
    }
  }

  static warn (message?: any) {
    if (this.enabled()) {
      console.warn(message)
    }
  }

  static error (message?: any) {
    if (this.enabled()) {
      console.error(message)
    }
  }

  private static enabled () {
    return !(process.env.NODE_ENV === 'production') || ((window as any)['DEBUG_ECHIP'] === true)
  }
}
