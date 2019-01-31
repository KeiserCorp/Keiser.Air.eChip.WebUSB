import EChipReaderWatcher from '../src/echipReaderWatcher'
import EChipReader from '../src/echipReader'
import EChip from '../src/echip'
import SyntaxHighlight from './syntax'

document.addEventListener('DOMContentLoaded', event => {
  const echipReaderWatcher = new EChipReaderWatcher()
  let echipReaders: Array<EChipReader> = []
  const connectButton = document.querySelector('#connect') as HTMLInputElement
  const disconnectButton = document.querySelector('#disconnect') as HTMLInputElement
  const keyField = document.querySelector('#key')
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

  if (disconnectButton) {
    disconnectButton.addEventListener('click', async () => {
      try {
        await echipReaderWatcher.stop()
      } catch (error) {
        console.error(error.message)
      }
    })
  }

  const disconnectEchip = () => {
    if (keyField) {
      keyField.innerHTML = ''
    }

    if (outputField) {
      outputField.innerHTML = ''
    }
  }

  const connectEchip = async (echip: EChip) => {
    echip.onDisconnect(disconnectEchip)

    if (keyField) {
      keyField.innerHTML = echip.id
    }

    let data = await echip.getData()
    console.log(data)
    if (outputField) {
      outputField.innerHTML = SyntaxHighlight(data.machineData)
    }
  }

  echipReaderWatcher.onConnect((echipReader) => {
    echipReader.onDisconnect(() => {
      if (disconnectButton) {
        disconnectButton.disabled = true
      }

      if (connectButton) {
        connectButton.disabled = false
      }
    })

    if (disconnectButton) {
      disconnectButton.disabled = false
    }

    if (connectButton) {
      connectButton.disabled = true
    }

    echipReaders.push(echipReader)
    echipReader.onEChipDetect((echip) => {
      connectEchip(echip)
    })
  })
})
