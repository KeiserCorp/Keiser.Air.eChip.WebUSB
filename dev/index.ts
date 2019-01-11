import EChip from '../src/echip'

const echip = new EChip()

document.addEventListener('DOMContentLoaded', event => {
  const connectButton = document.querySelector('#connect')

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      await echip.requestPermission()
    })
  }
})
