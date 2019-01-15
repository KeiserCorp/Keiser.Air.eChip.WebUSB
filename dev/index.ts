import EChipReader from '../src/echipReader'

const echipReader = new EChipReader()
let echipReaderDevices = []

echipReader.onConnect((echipReaderDevice) => {
  console.log(echipReaderDevice)
  echipReaderDevices.push(echipReaderDevice)
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
