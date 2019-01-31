import EChipReaderWatcher from '../src/echipReaderWatcher'
import EChipReader from '../src/echipReader'
import EChip from '../src/echip'

document.addEventListener('DOMContentLoaded', event => {
  const echipReaderWatcher = new EChipReaderWatcher()
  let echipReaders: Array<EChipReader> = []
  const connectButton = document.querySelector('#connect')
  const outputField = document.querySelector('#output')

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

  const processEchip = async (echip: EChip) => {
    if (outputField) {
      outputField.innerHTML = ''
      outputField.innerHTML += echip.id + '\n'
    }

    let data = await echip.getData()
    console.log(data)
  }

  echipReaderWatcher.onConnect((echipReader) => {
    echipReaders.push(echipReader)
    echipReader.onEChipDetect((echip) => {
      processEchip(echip)
    })
  })
})
