import EChipReaderWatcher from '../src/echipReaderWatcher'

const echipReaderWatcher = new EChipReaderWatcher()
let EChipReaders = []
let EChips = []

echipReaderWatcher.onConnect((echipReader) => {
  EChipReaders.push(echipReader)
  echipReader.onEChipDetect((echip) => {
    console.log(echip)
    EChips.push(echip)
  })
})

document.addEventListener('DOMContentLoaded', event => {
  const connectButton = document.querySelector('#connect')

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
