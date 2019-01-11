import doIt from '../src/index'

document.addEventListener('DOMContentLoaded', event => {
  let connectButton = document.querySelector('#connect')

  if (connectButton) {
    connectButton.addEventListener('click', function () {
      console.log(doIt('Jerk'))
    })
  }
})
