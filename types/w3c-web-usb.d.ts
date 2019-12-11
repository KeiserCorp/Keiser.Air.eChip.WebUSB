// Type definitions for W3C Web USB API 1.0
// Project: https://wicg.github.io/webusb/
// Definitions by: Lars Knudsen <https://github.com/larsgk>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.1

type USBDirection = "in" | "out"
type USBEndpointType = "bulk" | "interrupt" | "isochronous"
type USBRequestType = "standard" | "class" | "vendor"
type USBRecipient = "device" | "interface" | "endpoint" | "other"
type USBTransferStatus = "ok" | "stall" | "babble"

export interface USBEndpoint {
    readonly endpointNumber: number
    readonly direction: USBDirection
    readonly type: USBEndpointType
    readonly packetSize: number
}

export interface USBControlTransferParameters {
    requestType: USBRequestType
    recipient: USBRecipient
    request: number
    value: number
    index: number
}

export interface USBDeviceFilter {
    vendorId?: number
    productId?: number
    classCode?: number
    subclassCode?: number
    protocolCode?: number
    serialNumber?: string
}

export interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[]
}

export interface USBConnectionEventInit extends EventInit {
    device: WebUSBDevice
}

export declare class USBConfiguration {
    readonly configurationValue: number
    readonly configurationName?: string
    readonly interfaces: USBInterface[]
}

export declare class USBInterface {
    constructor(configuration: USBConfiguration, interfaceNumber: number)
    readonly interfaceNumber: number
    readonly alternate: USBAlternateInterface
    readonly alternates: USBAlternateInterface[]
    readonly claimed: boolean
}

export declare class USBAlternateInterface {
    constructor(deviceInterface: USBInterface, alternateSetting: number)
    readonly alternateSetting: number
    readonly interfaceClass: number
    readonly interfaceSubclass: number
    readonly interfaceProtocol: number
    readonly interfaceName?: string
    readonly endpoints: USBEndpoint[]
}

export declare class USBInTransferResult {
    constructor(status: USBTransferStatus, data?: DataView)
    readonly data?: DataView
    readonly status?: USBTransferStatus
}

export declare class USBOutTransferResult {
    constructor(status: USBTransferStatus, bytesWriten?: number)
    readonly bytesWritten: number
    readonly status: USBTransferStatus
}

export declare class USBIsochronousInTransferPacket {
    constructor(status: USBTransferStatus, data?: DataView)
    readonly data?: DataView
    readonly status?: USBTransferStatus
}

export declare class USBIsochronousInTransferResult {
    constructor(packets: USBIsochronousInTransferPacket[], data?: DataView)
    readonly data?: DataView
    readonly packets: USBIsochronousInTransferPacket[]
}

export declare class USBIsochronousOutTransferPacket {
    constructor(status: USBTransferStatus, bytesWritten?: number)
    readonly bytesWritten: number
    readonly status: USBTransferStatus
}

export declare class USBConnectionEvent extends Event {
    constructor(type: string, eventInitDict: USBConnectionEventInit)
    readonly device: WebUSBDevice
}

export declare class USBIsochronousOutTransferResult {
    constructor(packets: USBIsochronousOutTransferPacket[])
    readonly packets: USBIsochronousOutTransferPacket[]
}

export declare class WebUSB extends EventTarget {
    onconnect(): (this: this, ev: Event) => any
    ondisconnect(): (this: this, ev: Event) => any
    getDevices(): Promise<WebUSBDevice[]>
    requestDevice(options?: USBDeviceRequestOptions): Promise<WebUSBDevice>

    addEventListener(type: "connect" | "disconnect", listener: EventListener, useCapture?: boolean): void
}

export declare class WebUSBDevice {
    readonly usbVersionMajor: number
    readonly usbVersionMinor: number
    readonly usbVersionSubminor: number
    readonly deviceClass: number
    readonly deviceSubclass: number
    readonly deviceProtocol: number
    readonly vendorId: number
    readonly productId: number
    readonly deviceVersionMajor: number
    readonly deviceVersionMinor: number
    readonly deviceVersionSubminor: number
    readonly manufacturerName?: string
    readonly productName?: string
    readonly serialNumber?: string
    readonly configuration?: USBConfiguration
    readonly configurations: USBConfiguration[]
    readonly opened: boolean
    open(): Promise<void>
    close(): Promise<void>
    selectConfiguration(configurationValue: number): Promise<void>
    claimInterface(interfaceNumber: number): Promise<void>
    releaseInterface(interfaceNumber: number): Promise<void>
    selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>
    controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>
    controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>
    clearHalt(direction: USBDirection, endpointNumber: number): Promise<void>
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>
    isochronousTransferIn(endpointNumber: number, packetLengths: number[]): Promise<USBIsochronousInTransferResult>
    isochronousTransferOut(endpointNumber: number, data: BufferSource, packetLengths: number[]): Promise<USBIsochronousOutTransferResult>
    reset(): Promise<void>
}

declare global {
  interface Navigator {
      readonly usb?: WebUSB
  }
}