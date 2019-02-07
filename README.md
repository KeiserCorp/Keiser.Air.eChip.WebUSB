# Keiser Air eChip WebUSB Library
## Project
This library handles communication with the EChip USB reader using WebUSB.

Required Hardware: [USB to 1-Wire/iButton Adapter (DS9490)](https://www.maximintegrated.com/en/products/ibutton/ibutton/DS9490.html)

Required Drivers: [1-Wire/iButton Drivers for Windows](https://www.maximintegrated.com/en/products/ibutton/software/tmex/download_drivers.cfm)

## Installation
Install with [NPM](https://www.npmjs.com/): `npm install keiser-echip-utilities`

## Usage

Import module using preferred module loading technique and construct a new `EChipReaderWatcher` class.
```ts
import EChipReaderWatcher from 'keiser-echip-utilities'

const echipReaderWatcher = new EChipReaderWatcher()
```

The `EChipReaderWatcher` handles permissions and USB connection events. On first load, the browser will not have provided a grant to the site to access the USB device, so the `echipReaderWatcher.start()` method must be called by an event that originates from a user action.  This may only be required once on the first visit to the site, or it may be required each time the site is loaded based on browser vendors preferred implementation.

```ts
connectButton.addEventListener('click', async () => {
  try {
    await echipReaderWatcher.start()
  } catch (error) {
    console.error(error.message)
  }
})
```

Once the `echipReaderWatcher.start()` method has been called the class will prompt the browser for permission and begin watching for devices matching the EChip Readers device signature.  To be alerted when a device is found, pass a function to the `echipReaderWatcher.onConnect()` method.

```ts
echipReaderWatcher.onConnect((echipReader) => {
  console.log('EChip Reader Connected 😄')
})
```

The `echipReaderWatcher.onConnect()` will pass in an `EChipReader` object which is the object bound to the physical device connected.  This library is capable of handling multiple EChip Reader devices simultaneously, so the `onConnect()` method has potential for returning multiple `EChipReader` devices over the course of the application's life.

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

The `EChipReader` object also has an `onEChipDetect()` method which will alert when a valid EChip has been placed into the reader. The event passes in an `EChip` object that can be used to interact with the EChip data directly.  Just like the `echipReaderWatcher.onConnect()` method, the `EChipReader.onEChipDetect()` method can be called multiple times for multiple EChips all being handled concurrently.  Once an EChip is disconnected, the `EChip` object is disposed and cannot be reused.

Full example usage:
```ts
import EChipReaderWatcher from 'keiser-echip-utilities'

document.addEventListener('DOMContentLoaded', event => {
  const echipReaderWatcher = new EChipReaderWatcher()
  const connectButton = document.querySelector('#connect') as HTMLInputElement

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      try {
        await echipReaderWatcher.start()
      } catch (error) {
        console.error(error.message)
      }
    })
  }

  echipReaderWatcher.onConnect((echipReader) => {
    console.log('EChip Reader Connected 😄')
    
    echipReader.onEChipDetect((echip) => {
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

_Coming Soon_

## References
[Maxim Integrated 1-Wire USB Android notes](https://www.maximintegrated.com/en/app-notes/index.mvp/id/5705)

[Maxim Integrated 1-Wire USB Android project](https://www.maximintegrated.com/en/design/tools/appnotes/5705/an5705-software.zip)


## Copyright and License
Copyright [Keiser Corporation](http://keiser.com/) under the [MIT license](LICENSE.md).
