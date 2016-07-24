import co from 'co'
import queueIncomingMessage from './incomingMessageQueue'
import _ from 'lodash'

const SUPPORTED_EVENTS = ['message']

function receiveWebhook(payload) {
  return co(function*() {
    let entries = payload.entry
    if (entries == null) return
    for (let entry of entries) {
      let messaging = entry.messaging
      if (messaging == null) return
      for (let event of messaging) {
        for (let type of SUPPORTED_EVENTS) {
          if (event[type]) {
            console.log(`[${event.sender.id} @ ${event.timestamp}] >> ${_.get(event, 'message.text') || '(non-text content)'}`)
            yield queueIncomingMessage(event)
            break
          }
        }
      }
    }
  })
}

export default {
  receive: receiveWebhook
}
