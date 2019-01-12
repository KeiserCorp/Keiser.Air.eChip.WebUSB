import EChip from '../src/echip'

const echip = new EChip()

echip.onConnectionChange((e) => {
  console.log('Connected: ' + e.connected)
})

document.addEventListener('DOMContentLoaded', event => {
  const connectButton = document.querySelector('#open')

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      try {
        await echip.open()
      } catch (error) {
        console.error('Caught Error:', error)
      }
    })
  }
})
