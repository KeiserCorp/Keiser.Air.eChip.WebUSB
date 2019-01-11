export default class OWReader {
  coreDevice: USBDevice

  constructor (device: USBDevice) {
    this.coreDevice = device

    // this.initialize()
  }

  /*****************************************
  *  Exposed Controls
  *****************************************/

  isSameDevice (device: USBDevice) {
    return device.serialNumber === this.coreDevice.serialNumber
  }

  async disconnect () {
    try {
      // this.stopTransfer()
      // this.coreDevice.close()
      // if (process.env.NODE_ENV !== 'production') {
      //   console.log('Device closed')
      // }
    } catch (error) {
      // if (process.env.NODE_ENV !== 'production') {
      //   console.error('Error closing device\n', error)
      // }
    }
  }

  /*****************************************
  *  Control Flow
  *****************************************/

  async initialize () {
    try {
      await this.coreDevice.open()
    } catch (error) {
      throw new Error('USB Device cannot be opened.\n[Check driver installation.]')
    }
    // await this.mapEndpoints()
    // this.startTransfer()
  }

  /*****************************************
  *  Interface and Endpoints
  *****************************************/

  async mapEndpoints () {
    let targetConfiguration: USBConfiguration | null = null
    let targetInterface: USBInterface | null = null
    this.coreDevice.configurations.forEach(configuration => {
      configuration.interfaces.forEach(usbInterface => {
        usbInterface.alternates.forEach(alternate => {
          alternate.endpoints.forEach(endpoint => {
            // if (endpoint.direction === 'in' && endpoint.type === 'bulk') {
            //   targetConfiguration = configuration
            //   targetInterface = usbInterface
            //   this.bulkInEndpoint = endpoint
            // }
          })
        })
      })
    })

    if (!targetInterface || !targetConfiguration) {
      throw new Error('Device interfaces unavailable')
    }

    // try {
    //   if (this.coreDevice.configuration === null || this.coreDevice.configuration.configurationValue !== targetConfiguration!.configurationValue) {
    //     await this.coreDevice.selectConfiguration(targetConfiguration!.configurationValue)
    //   }
    //   await this.coreDevice.claimInterface(targetInterface!.interfaceNumber)
    // } catch (error) {
    //   console.error(error)
    // }
  }

  // /*****************************************
  // *  Transfer
  // *****************************************/

  // async startTransfer () {
  //   if (!this.bulkInEndpoint) {
  //     throw new Error('Device endpoint not assigned')
  //   }

  //   this.continueTransfer = true

  //   try {
  //     while (this.continueTransfer) {
  //       let result = await this.coreDevice.transferIn(this.bulkInEndpoint.endpointNumber, 4096)

  //       if (result.data && result.data.byteLength > 0) {
  //         this.parse(result.data)
  //       }

  //       if (result.status === 'stall') {
  //         await this.coreDevice.clearHalt('in', this.bulkInEndpoint.endpointNumber)
  //       }
  //     }
  //   } catch (error) {
  //     this.stopTransfer()
  //   }
  // }

  // stopTransfer () {
  //   this.continueTransfer = false
  // }

  // /*****************************************
  // *  Parse
  // *****************************************/

  // parse (data: DataView) {
  //   let rawStream = new Uint8Array(data.buffer)
  //   let segments = String.fromCharCode.apply(null, rawStream).split(' ')
  //   let firstSegmentValue = parseInt(segments[0], 10)
  //   if (firstSegmentValue <= 200) {
  //     let swValue = parseFloat(segments[6])
  //     if (swValue >= 6.0 && swValue < 7.0) {
  //       try {
  //         let broadcast = MSeriesParser(segments)
  //         this.callback(broadcast)
  //       } catch (error) {
  //         console.error('M Series parse error\n', error)
  //       }
  //     } else if (swValue >= 8.0 && swValue < 9.0) {
  //       console.error('Incorrect device connected')
  //     }
  //   }
  // }
}
