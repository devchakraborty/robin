import '../env-setup'
import Queue from 'firebase-queue'
import firebase from 'firebase'
import co from 'co'

import messageSender from './messageSender'

const MAX_MESSAGE_HOLD_TIME = 5000

let queueRef = firebase.database().ref('outgoing_message_queue')

let queueSpecs = {
   outgoing_message: {
     in_progress_state: 'outgoing_message_in_progress',
     finished_state: 'outgoing_message_finished'
   }
}

queueRef.child('specs').set(queueSpecs)

let queue = new Queue(queueRef, {specId: 'outgoing_message', numWorkers:2}, function(data, progress, resolve, reject) {
  co(function*() {
    data = data.data
    console.log('dequeuing', data)
    if (data.send_at == null || new Date(data.send_at) <= new Date()) {
      yield messageSender.send(data.data)
    } else {
      yield new Promise((resolve, reject) => {
        let timeUntil = new Date(data.send_at).getTime() - new Date()
        if (timeUntil < 0) timeUntil = 0
        if (timeUntil <= MAX_MESSAGE_HOLD_TIME) {
          setTimeout(() => {
            messageSender.send(data.data).then(resolve).catch(reject)
          }, timeUntil)
        } else {
          setTimeout(() => {
            queueMessage(data).then(resolve).catch(reject)
          }, MAX_MESSAGE_HOLD_TIME)
        }
      })
    }
    return
  }).then(resolve).catch(reject)
})

function queueMessage(message) {
  return co(function*() {
    console.log('enqueuing', message)
    return yield queueRef.child('tasks').push({data: message})
  })
}

export default queueMessage
