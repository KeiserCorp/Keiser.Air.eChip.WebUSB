import EChipReader from '../src/echipReader'

const echipReader = new EChipReader()

echipReader.onConnectionChange((e) => {
  console.log('Connected: ' + e.connected)
  console.log(e.echipReaderDevice)
})

document.addEventListener('DOMContentLoaded', event => {
  const connectButton = document.querySelector('#connect')

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      try {
        await echipReader.connect()
      } catch (error) {
        console.error('Caught Error:', error)
      }
    })
  }
})
