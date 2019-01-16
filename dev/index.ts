import EChipReaderWatcher from '../src/echipReaderWatcher'
import EChipReader from '../src/EChipReader'

const echipReaderWatcher = new EChipReaderWatcher()
let echipReaders: Array<EChipReader> = []
let echips = []

echipReaderWatcher.onConnect((echipReader) => {
  echipReaders.push(echipReader)
  echipReader.onEChipDetect((echip) => {
    echips.push(echip)
  })
})

document.addEventListener('DOMContentLoaded', event => {
  const connectButton = document.querySelector('#connect')
  // const outputField = document.querySelector('#output')

  window.addEventListener('onunload', event => {
    // This doesn't work, but I think it should 😕
    console.log('UNLOADING')
    echipReaderWatcher.stop()
  })

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      try {
        await echipReaderWatcher.start()
      } catch (error) {
        console.error(error.message)
      }
    })
  }
})
