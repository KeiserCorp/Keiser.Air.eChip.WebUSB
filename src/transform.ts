import { NodeUSBDevice, ConfigDescriptor, InterfaceDescriptor, Interface, Endpoint } from '../types/node-usb'

class ConvertedUSBDevice {
  private nodeUsbDevice: NodeUSBDevice
  // readonly usbVersionMajor: number
  // readonly usbVersionMinor: number
  // readonly usbVersionSubminor: number
  readonly deviceClass: number
  readonly deviceSubclass: number
  readonly deviceProtocol: number
  readonly vendorId: number
  readonly productId: number
  // readonly deviceVersionMajor: number
  // readonly deviceVersionMinor: number
  // readonly deviceVersionSubminor: number
  // readonly manufacturerName?: string
  // readonly productName?: string
  // readonly serialNumber?: string
  private _opened = false

  constructor (nodeUsbDevice: NodeUSBDevice) {
    this.nodeUsbDevice = nodeUsbDevice
    this.deviceClass = nodeUsbDevice.deviceDescriptor.bDeviceClass
    this.deviceSubclass = nodeUsbDevice.deviceDescriptor.bDeviceSubClass
    this.deviceProtocol = nodeUsbDevice.deviceDescriptor.bDeviceProtocol
    this.vendorId = nodeUsbDevice.deviceDescriptor.idVendor
    this.productId = nodeUsbDevice.deviceDescriptor.idProduct

    console.log(nodeUsbDevice)
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

  private configurationTransform (config: ConfigDescriptor) {
    const allInterfaces = config.interfaces.reduce((a, v) => a.concat(v), [])
    return {
      configurationValue: config.bConfigurationValue,
      configurationName: '',
      interfaces: allInterfaces.map(i => this.interfaceTransform(i))
    } as USBConfiguration
  }

  private interfaceTransform (desc: InterfaceDescriptor) {
    return {
      interfaceNumber: desc.bInterfaceNumber,
      alternate: this.interfaceAltTransform(desc, this.nodeUsbDevice.interface(desc.bInterfaceNumber))
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
      type: this.endpointTypeTransform(endpoint.transferType)
    } as USBEndpoint
  }

  private endpointTypeTransform (endpointType: number) {
    switch (endpointType) {
      case window.node_usb.LIBUSB_TRANSFER_TYPE_BULK:
        return 'bulk'
      case window.node_usb.LIBUSB_TRANSFER_TYPE_INTERRUPT:
        return 'interrupt'
      case window.node_usb.LIBUSB_TRANSFER_TYPE_ISOCHRONOUS:
        return 'isochronous'
    }
  }
}

export function nodeToWeb (nodeUsbDevice: NodeUSBDevice) {
  return ((new ConvertedUSBDevice(nodeUsbDevice)) as unknown) as WebUSBDevice
}
