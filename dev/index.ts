import EChipReaderWatcher from '../src/echipReaderWatcher'

const echipReaderWatcher = new EChipReaderWatcher()
let EChipReaders = []

echipReaderWatcher.onConnect((echipReader) => {
  EChipReaders.push(echipReader)
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
