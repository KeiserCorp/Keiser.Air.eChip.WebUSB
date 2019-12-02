import { NodeUSBDevice, ConfigDescriptor, InterfaceDescriptor, Interface, Endpoint, LibUSBException, InEndpoint, OutEndpoint } from '../types/node-usb'
import { WebUSBConnectionEvent } from './typedEvent'

class ConvertedUSBDevice {
  private nodeUsbDevice: NodeUSBDevice
  // readonly usbVersionMajor: number = 0
  // readonly usbVersionMinor: number = 0
  // readonly usbVersionSubminor: number = 0
  readonly deviceClass: number
  readonly deviceSubclass: number
  readonly deviceProtocol: number
  readonly vendorId: number
  readonly productId: number
  // readonly deviceVersionMajor: number = 0
  // readonly deviceVersionMinor: number = 0
  // readonly deviceVersionSubminor: number = 0
  // readonly manufacturerName?: string
  // readonly productName?: string
  // readonly serialNumber?: string
  private _opened = false
  private _claimedInterface: Interface | null = null

  constructor (nodeUsbDevice: NodeUSBDevice) {
    this.nodeUsbDevice = nodeUsbDevice
    this.deviceClass = nodeUsbDevice.deviceDescriptor.bDeviceClass
    this.deviceSubclass = nodeUsbDevice.deviceDescriptor.bDeviceSubClass
    this.deviceProtocol = nodeUsbDevice.deviceDescriptor.bDeviceProtocol
    this.vendorId = nodeUsbDevice.deviceDescriptor.idVendor
    this.productId = nodeUsbDevice.deviceDescriptor.idProduct
  }

  get configuration () {
    return this.configurationTransform(this.nodeUsbDevice.configDescriptor)
  }

  get configurations () {
    return this.nodeUsbDevice.allConfigDescriptors.map(config => {
      return this.configurationTransform(config)
    })
  }

  get opened () {
    return this._opened
  }

  open () {
    try {
      this.nodeUsbDevice.open()
      this._opened = true
    } catch (error) {
      return Promise.reject(error)
    }
    return Promise.resolve()
  }

  close () {
    try {
      this.nodeUsbDevice.close()
    } catch (error) {
      return Promise.reject(error)
    }
    return Promise.resolve()
  }

  async selectConfiguration (configurationValue: number) {
    return new Promise((resolve, reject) => {
      this.nodeUsbDevice.setConfiguration(configurationValue, (error?: string) => {
        if (error) {
          return reject(error)
        }
        resolve()
      })
    })
  }

  async claimInterface (interfaceNumber: number) {
    try {
      const targetInterface = this.nodeUsbDevice.interfaces.find(i => i.interfaceNumber === interfaceNumber)
      if (!targetInterface) {
        throw new Error('Interface not found')
      }
      targetInterface.claim()
      this._claimedInterface = targetInterface
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  releaseInterface (interfaceNumber: number) {
    return new Promise((resolve, reject) => {
      const targetInterface = this.nodeUsbDevice.interfaces.find(i => i.interfaceNumber === interfaceNumber)
      if (!targetInterface) {
        return reject('Interface not found')
      }
      targetInterface.release((error?: string) => {
        if (error) {
          return reject(error)
        }
        this._claimedInterface = null
        resolve()
      })
    })
  }

  selectAlternateInterface (interfaceNumber: number, alternateSetting: number) {
    return new Promise((resolve, reject) => {
      const targetInterface = this.nodeUsbDevice.interfaces.find(i => i.interfaceNumber === interfaceNumber)
      if (!targetInterface) {
        return reject('Interface not found')
      }
      targetInterface.setAltSetting(alternateSetting, (error?: string) => {
        if (error) {
          return reject(error)
        }
        resolve()
      })
    })
  }

  controlTransferIn (setup: USBControlTransferParameters, length: number) {
    return new Promise((resolve, reject) => {
      this.nodeUsbDevice.controlTransfer(
        this.requestTypeTransform(setup.requestType),
        setup.request,
        setup.value,
        setup.index,
        length,
        (error ?: LibUSBException, buf?: Buffer) => {
          if (error) {
            return reject(error.message)
          }
          if (!buf) {
            return reject('No buffer returned')
          }
          resolve({
            data: new DataView(buf),
            status: 'ok'
          } as USBInTransferResult)
        })
    })
  }

  controlTransferOut (setup: USBControlTransferParameters, data?: BufferSource) {
    return new Promise((resolve, reject) => {
      this.nodeUsbDevice.controlTransfer(
        this.requestTypeTransform(setup.requestType),
        setup.request,
        setup.value,
        setup.index,
        data ? this.arrayBufferToBuffer(data) : Buffer.from(''),
        (error ?: LibUSBException, buf?: Buffer) => {
          if (error) {
            return reject(error.message)
          }
          resolve({
            bytesWritten: data ? data.byteLength : 0,
            status: 'ok'
          } as USBOutTransferResult)
        })
    })
  }

  transferIn (endpointNumber: number, length: number) {
    return new Promise((resolve, reject) => {
      if (!this._claimedInterface) {
        return reject('No interface claimed')
      }

      const targetEndpoint = this._claimedInterface.endpoint(endpointNumber) as InEndpoint
      if (!targetEndpoint || targetEndpoint.direction !== 'in') {
        return reject('No endpoint found')
      }

      targetEndpoint.transfer(length, (error: LibUSBException, data: Buffer) => {
        if (error) {
          return reject(error.message)
        }
        resolve({
          data: new DataView(data.buffer, 0, data.length),
          status: 'ok'
        } as USBInTransferResult)
      })
    })
  }

  transferOut (endpointNumber: number, data: BufferSource) {
    return new Promise((resolve, reject) => {
      if (!this._claimedInterface) {
        return reject('No interface claimed')
      }

      const targetEndpoint = this._claimedInterface.endpoint(endpointNumber) as OutEndpoint
      if (!targetEndpoint || targetEndpoint.direction !== 'out') {
        return reject('No endpoint found')
      }

      targetEndpoint.transfer(this.arrayBufferToBuffer(data), (error?: LibUSBException) => {
        if (error) {
          return reject(error.message)
        }

        resolve({
          bytesWritten: data ? data.byteLength : 0,
          status: 'ok'
        } as USBOutTransferResult)
      })
    })
  }

  reset () {
    return new Promise((resolve, reject) => {
      this.nodeUsbDevice.reset((error?: string) => {
        if (error) {
          if (typeof navigator.usb !== 'undefined') {
            navigator.usb.dispatchEvent(new WebUSBConnectionEvent('disconnect', { device: this.asWebUSBDevice() }))
          }
          return reject(error)
        }
        resolve()
      })
    })
  }

  private asWebUSBDevice () {
    return (this as unknown) as WebUSBDevice
  }

  private configurationTransform (config: ConfigDescriptor) {
    const allInterfaces = config.interfaces.reduce((a, v) => a.concat(v), [])
    return {
      configurationValue: config.bConfigurationValue,
      configurationName: '',
      interfaces: allInterfaces.map(i => this.interfaceTransform(config, i))
    } as USBConfiguration
  }

  private interfaceTransform (config: ConfigDescriptor, desc: InterfaceDescriptor) {
    const allInterfaces = config.interfaces.reduce((a, v) => a.concat(v), [])
    return {
      interfaceNumber: desc.bInterfaceNumber,
      alternate: this.interfaceAltTransform(desc, this.nodeUsbDevice.interface(desc.bInterfaceNumber)),
      alternates: allInterfaces.map(i => this.interfaceAltTransform(desc, this.nodeUsbDevice.interface(i.bInterfaceNumber)))
    } as USBInterface
  }

  private interfaceAltTransform (desc: InterfaceDescriptor, inter: Interface) {
    return {
      alternateSetting: desc.bAlternateSetting,
      interfaceClass: desc.bInterfaceClass,
      interfaceSubclass: desc.bInterfaceSubClass,
      interfaceProtocol: desc.bInterfaceProtocol,
      interfaceName: '',
      endpoints: inter.endpoints.map(e => this.endpointTransform(e))
    } as USBAlternateInterface
  }

  private endpointTransform (endpoint: Endpoint) {
    return {
      endpointNumber: endpoint.descriptor.bEndpointAddress,
      direction: endpoint.direction as USBDirection,
      type: this.endpointTypeTransform(endpoint.transferType),
      packetSize: endpoint.descriptor.wMaxPacketSize
    } as USBEndpoint
  }

  private endpointTypeTransform (endpointType: number) {
    if (typeof window.node_usb === 'undefined') {
      throw new Error('Node-USB not found')
    }
    switch (endpointType) {
      case window.node_usb.LIBUSB_TRANSFER_TYPE_BULK:
        return 'bulk'
      case window.node_usb.LIBUSB_TRANSFER_TYPE_INTERRUPT:
        return 'interrupt'
      case window.node_usb.LIBUSB_TRANSFER_TYPE_ISOCHRONOUS:
        return 'isochronous'
    }
  }

  private requestTypeTransform (requestType: USBRequestType) {
    if (typeof window.node_usb === 'undefined') {
      throw new Error('Node-USB not found')
    }
    switch (requestType) {
      case 'standard':
        return window.node_usb.LIBUSB_REQUEST_TYPE_STANDARD
      case 'class':
        return window.node_usb.LIBUSB_REQUEST_TYPE_CLASS
      case 'vendor':
        return window.node_usb.LIBUSB_REQUEST_TYPE_VENDOR
    }
  }

  private arrayBufferToBuffer (buffer: BufferSource) {
    if (buffer instanceof ArrayBuffer) {
      return Buffer.from(buffer)
    }
    return Buffer.from('')
  }
}

export function nodeToWeb (nodeUsbDevice: NodeUSBDevice) {
  return ((new ConvertedUSBDevice(nodeUsbDevice)) as unknown) as WebUSBDevice
}
