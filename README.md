# Keiser Air eChip WebUSB Library
![](https://github.com/KeiserCorp/Keiser.Air.eChip.WebUSB/workflows/Publish%20NPM/badge.svg?branch=production)

## Project
This library handles communication with the Chip USB reader using WebUSB.

Required Hardware: [USB to 1-Wire/iButton Adapter (DS9490)](https://www.maximintegrated.com/en/products/ibutton/ibutton/DS9490.html)

Required Drivers: [1-Wire/iButton Drivers for Windows](https://www.maximintegrated.com/en/products/ibutton/software/tmex/download_drivers.cfm)

## Installation
Install with [npm](https://www.npmjs.com/): `npm install @keiser/echip-webusb`

## Usage

Import singleton instance from module using preferred module loading technique.
```ts
import ChipReaderWatcher from '@keiser/echip-webusb'

if (ChipReaderWatcher.isConnected) {
  console.log('Chip Reader Connected 😄')
}
```

The `ChipReaderWatcher` handles permissions and USB connection events. On first load, the browser will not have provided a grant to the site to access the USB device, so the `ChipReaderWatcher.start()` method must be called by an event that originates from a user action. This may only be required once on the first visit to the site, or it may be required each time the site is loaded based on browser vendors preferred implementation.

```ts
connectButton.addEventListener('click', async () => {
  try {
    await ChipReaderWatcher.start()
  } catch (error) {
    console.error(error.message)
  }
})
```

Once the `ChipReaderWatcher.start()` method has been called the class will prompt the browser for permission and begin watching for devices matching the Chip Readers device signature. To be alerted when a device is found, pass a function to the `ChipReaderWatcher.onConnect()` method.

```ts
ChipReaderWatcher.onConnect((chipReader) => {
  console.log('Chip Reader Connected 😄')
})
```

The `ChipReaderWatcher.onConnect()` will pass in a `ChipReader` object which is the object bound to the physical device connected. This library is capable of handling multiple Chip Reader devices simultaneously, so the `onConnect()` method has potential for returning multiple `ChipReader` devices over the course of the application's life.

```ts
chipReader.onDisconnect(() => {
  console.log('Chip Reader Disconnected 😞')
})
```

The `ChipReader` object has an `onDisconnect()` method which will alert when the Chip Reader has been disconnected for some reason. Once a `ChipReader` object has been disconnected, it is disposed and cannot be used again. The next time the device is connected, a new `ChipReader` object will be returned.

```ts
chipReader.onChipDetect(async (chip) => {
  console.log('Chip Connected: ' + chip.id)
  console.log(await chip.getData())
})
```

The `ChipReader` object also has an `onChipDetect()` method which will alert when a valid chip has been placed into the reader. The event passes in a `Chip` object that can be used to interact with the chip data directly. Just like the `ChipReaderWatcher.onConnect()` method, the `ChipReader.onChipDetect()` method can be called multiple times for multiple chips all being handled concurrently. Once a chip is disconnected, the `Chip` object is disposed and cannot be reused.

### Full example usage:
```ts
import ChipReaderWatcher from '@keiser/echip-webusb'

document.addEventListener('DOMContentLoaded', event => {
  const connectButton = document.querySelector('#connect') as HTMLInputElement

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      try {
        await ChipReaderWatcher.start()
      } catch (error) {
        console.error(error.message)
      }
    })
  }

  ChipReaderWatcher.onConnect((chipReader) => {
    console.log('Chip Reader Connected 😄')

    chipReader.onChipDetect(async (chip) => {
      console.log('Chip Connected: ' + chip.id)
      chip.onData(data => console.log(data))
    })

    chipReader.onDisconnect(() => {
      console.log('Chip Reader Disconnected 😞')
    })
  })
})
```

## API

### ChipReaderWatcher

The `ChipReaderWatcher` is a singleton class which handles the USB device monitoring and permissions handling. There can be only one `ChipReaderWatcher` instance created within a `window` scope, so the library instantiates the class during import and preserves a single instance for all imports.

#### Properties
| Name | Usage |
| ---- | ----- |
| `isConnected: boolean` | Indicates whether a Chip Reader device is connected |

#### Methods
| Name | Usage |
| ---- | ----- |
| `onConnect(Listener<ChipReader>): Disposable` | Adds an event listener for when a Chip Reader device is connected. Callback method will be passed the new `ChipReader` instance for the connected device. |
| `start(): Promise<void>` | Initializes the watcher by first requesting permissions and then doing a hardware search. This method must be triggered by a user action such as a click event or the permission request will be denied. |
| `stop(): Promise<void>` | Closes all active connections. |

### ChipReader

The `ChipReader` instance is passed into the `onConnect` callback function and is the interface to the connected Chip Reader device.

#### Properties
| Name | Usage |
| ---- | ----- |
| `claimed: Promise<boolean>` | Promise indicating if the USB device interface has been claimed. |
| `disposed: boolean` | Indicates if the device connection has been severed and the class instance disposed. |

#### Methods
| Name | Usage |
| ---- | ----- |
| `onChipDetect(Listener<Chip>): Disposable` | Adds an event listener for when a chip is connected to the Chip Reader device. Callback method will be passed the new `Chip` instance for the connected chip. |
| `onDisconnect(Listener<null>): Disposable` | Adds an event listener for when this Chip Reader device becomes disconnected. The instance will be disposed following this event. |

### BaseChip

The `BaseChip` instance is passed into the `onChipDetect` callback function and is the interface to the connected chip device. There are several different extensions to the base `BaseChip` object that can identified by doing a `instanceOf` check or looking at the `type` property.

#### Properties
| Name | Usage |
| ---- | ----- |
| `disposed: boolean` | Indicates if the eChip connection has been severed and the class instance disposed. |
| `data: ChipObject` | Generic object with the current data from the chip. |
| `id: string` | UUID string of the eChip. |
| `type: ChipType` | `ChipType` enum value corresponding to the type of chip. |

#### Methods
| Name | Usage |
| ---- | ----- |
| `destroy(): void` | Called to disconnect the eChip device. |
| `onDisconnect(Listener<null>): Disposable` | Adds an event listener for when this chip becomes disconnected. The instance will be disposed following this event. |
| `onData(Listener<ChipObject>): Disposable` | Adds an event listener for when the chip data has changed. |

## TZChip and RTCChip

The `TZChip` and `RTCChip` are class extensions on the `BaseChip` class. They add no additional properties or methods, but allow the identification of chip type and will perform chip set operations automatically when detected. An event issued on the `onData` event indicates that the chips data has been successfully updated.

## DataChip

The `DataChip` class extension on the `BaseChip` class adds additional properties and methods specific to the data chip.

#### Methods
| Name | Usage |
| ---- | ----- |
| `clearData(): Promise<void>` | Method clears the data on the chip and resolve the promise on successful write. An `onData` event will be issues for the blank chip data. |
| `setData({string: MachineObject}): Promise<void>` | Method sets the data on the chip according to the data passed into the method. The method accepts an object with `string` keys corresponding to the machine's 4-digit model number with the `MachineObject` as the value of the property. Method resolve the promise on successful write. An `onData` event will be issues for the freshly written chip data. |

### Data Structures

#### ChipObject
```ts
interface ChipObject {
  type: ChipType
}
```

#### DataChipObject
```ts
interface DataChipObject {
  type: ChipType
  machineData: {[index: string]: MachineObject}
  rawData: Uint8Array[]
  validStructure: boolean
}
```

#### MachineObject
```ts
interface MachineObject {
  position: MachinePosition
  sets: MachineSet[]
}
```

#### MachinePosition
```ts
interface MachinePosition {
  chest: number | null
  rom2: number | null
  rom1: number | null
  seat: number | null
}
```

#### MachineSet
```ts
interface MachineSet {
  version: string
  serial: string
  time: string
  resistance: number
  precision: Precision
  units: ForceUnit
  repetitions: number
  peak: number | null
  work: number | null
  distance: number | null
  chest: number | null
  rom2: number | null
  rom1: number | null
  seat: number | null
  test: MachineTest | null
}
```

#### MachineTest
```ts
interface MachineTest {
  type: TestType
  high: MachineTestResult | null
  low: MachineTestResult | null
}
```

#### MachineTestResult
```ts
interface MachineTestResult {
  power: number
  velocity: number
  force: number
  position: number
}
```

### Constants

```ts
enum Precision {
  dec = 'dec',
  int = 'int'
 }

enum ForceUnit {
  lb = 'lb',
  kg = 'kg',
  ne = 'ne',
  er = 'er'
}

enum TestType {
  power6r = 'power6r',
  a4206r = 'a4206r',
  a42010r = 'a42010r'
}

enum ChipType {
  dataChip = 12,
  rtcChip = 36,
  tzChip = 45,
  unknown = 0
}
```

## References
[Maxim Integrated 1-Wire USB Android notes](https://www.maximintegrated.com/en/app-notes/index.mvp/id/5705)

[Maxim Integrated 1-Wire USB Android project](https://www.maximintegrated.com/en/design/tools/appnotes/5705/an5705-software.zip)


## Copyright and License
Copyright [Keiser Corporation](http://keiser.com/) under the [MIT license](LICENSE.md).
