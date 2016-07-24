import './env-setup'
import FB from 'fb'

function api() {
  let args = arguments
  return new Promise((resolve, reject) => {
    FB.api(...args, function(res) {
      if (!res) reject('Unknown error')
      else if (res.error) reject(res.error)
      else resolve(res)
    })
  })
}

export default {api}
