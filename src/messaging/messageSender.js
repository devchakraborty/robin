import co from 'co'
import FB from '../FB'
import _ from 'lodash'

function sendMessage(message) {
  return co(function*() {
    console.log(`[${message.recipient.id} @ ${new Date().getTime()}] << ${_.get(message, 'message.text') || '(rich content)'}`)
    return yield FB.api('me/messages', 'post', message)
  })
}

export default {
  send: sendMessage
}
