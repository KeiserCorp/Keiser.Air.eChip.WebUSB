# Keiser Air eChip WebUSB Library
![](https://github.com/KeiserCorp/Keiser.Air.eChip.WebUSB/workflows/Publish%20NPM/badge.svg?branch=production)

## Project
This library handles communication with the EChip USB reader using WebUSB.

Required Hardware: [USB to 1-Wire/iButton Adapter (DS9490)](https://www.maximintegrated.com/en/products/ibutton/ibutton/DS9490.html)

Required Drivers: [1-Wire/iButton Drivers for Windows](https://www.maximintegrated.com/en/products/ibutton/software/tmex/download_drivers.cfm)

## Installation
Install with [NPM](https://www.npmjs.com/): `npm install @keiser/echip-webusb`

## Usage

Import singleton instance from module using preferred module loading technique.
```ts
import EChipReaderWatcher from '@keiser/echip-webusb'

if (EChipReaderWatcher.isConnected) {
  console.log('EChip Reader Connected 😄')
}
```

The `EChipReaderWatcher` handles permissions and USB connection events. On first load, the browser will not have provided a grant to the site to access the USB device, so the `EChipReaderWatcher.start()` method must be called by an event that originates from a user action.  This may only be required once on the first visit to the site, or it may be required each time the site is loaded based on browser vendors preferred implementation.

```ts
connectButton.addEventListener('click', async () => {
  try {
    await EChipReaderWatcher.start()
  } catch (error) {
    console.error(error.message)
  }
})
```

Once the `EChipReaderWatcher.start()` method has been called the class will prompt the browser for permission and begin watching for devices matching the EChip Readers device signature.  To be alerted when a device is found, pass a function to the `EChipReaderWatcher.onConnect()` method.

```ts
EChipReaderWatcher.onConnect((echipReader) => {
  console.log('EChip Reader Connected 😄')
})
```

The `EChipReaderWatcher.onConnect()` will pass in an `EChipReader` object which is the object bound to the physical device connected.  This library is capable of handling multiple EChip Reader devices simultaneously, so the `onConnect()` method has potential for returning multiple `EChipReader` devices over the course of the application's life.

```ts
echipReader.onDisconnect(() => {
  console.log('EChip Reader Disconnected 😞')
})
```

The `EChipReader` object has a `onDisconnect()` method which will alert when the EChip Reader has been disconnected for some reason.  Once an `EChipReader` object has been disconnected, it is disposed and cannot be used again.  The next time the device is connected, a new `EChipReader` object will be returned.

```ts
echipReader.onEChipDetect(async (echip) => {
  console.log('EChip Connected: ' + echip.id)
  console.log(await echip.getData())
})
```

The `EChipReader` object also has an `onEChipDetect()` method which will alert when a valid EChip has been placed into the reader. The event passes in an `EChip` object that can be used to interact with the EChip data directly.  Just like the `EChipReaderWatcher.onConnect()` method, the `EChipReader.onEChipDetect()` method can be called multiple times for multiple EChips all being handled concurrently.  Once an EChip is disconnected, the `EChip` object is disposed and cannot be reused.

Full example usage:
```ts
import EChipReaderWatcher from '@keiser/echip-webusb'

document.addEventListener('DOMContentLoaded', event => {
  const connectButton = document.querySelector('#connect') as HTMLInputElement

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      try {
        await EChipReaderWatcher.start()
      } catch (error) {
        console.error(error.message)
      }
    })
  }

  EChipReaderWatcher.onConnect((echipReader) => {
    console.log('EChip Reader Connected 😄')

    echipReader.onEChipDetect(async (echip) => {
      console.log('EChip Connected: ' + echip.id)
      console.log(await echip.getData())
    })

    echipReader.onDisconnect(() => {
      console.log('EChip Reader Disconnected 😞')
    })
  })
})
```

## API

### EChipReaderWatcher

The `EChipReaderWatcher` is a singleton class which handles the USB device monitoring and permissions handling. There can be only one `EChipReaderWatcher` instance created within a `window` scope, so the library instantiates the class during import and preserves a single instance for all imports.

#### Properties
| Name | Type | Usage |
| ---- | ----------- | ----- |
| `isConnected` | `Boolean` | Indicates whether an eChip Reader Device is connected |

#### Properties
| Name | Parameters | Return Type | Usage |
| ---- | ---------- | ----------- | ----- |
| `onConnect` | `Listener<EChipReader>` | `Disposable` | Adds an event listener for when an eChip Reader Device is connected |


```ts
import EChipReaderWatcher from '@keiser/echip-webusb'

document.addEventListener('DOMContentLoaded', event => {
  const connectButton = document.querySelector('#connect') as HTMLInputElement

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      try {
        await EChipReaderWatcher.start()
      } catch (error) {
        console.error(error.message)
      }
    })
  }

  EChipReaderWatcher.onConnect((echipReader) => {
    console.log('EChip Reader Connected 😄')

    echipReader.onEChipDetect(async (echip) => {
      console.log('EChip Connected: ' + echip.id)
      console.log(await echip.getData())
    })

    echipReader.onDisconnect(() => {
      console.log('EChip Reader Disconnected 😞')
    })
  })
})
```

## References
[Maxim Integrated 1-Wire USB Android notes](https://www.maximintegrated.com/en/app-notes/index.mvp/id/5705)

[Maxim Integrated 1-Wire USB Android project](https://www.maximintegrated.com/en/design/tools/appnotes/5705/an5705-software.zip)


## Copyright and License
Copyright [Keiser Corporation](http://keiser.com/) under the [MIT license](LICENSE.md).
