import '../env-setup'
import Queue from 'firebase-queue'
import firebase from 'firebase'
import co from 'co'

import messageProcessor from './messageProcessor'

let queueRef = firebase.database().ref('incoming_message_queue')

let queueSpecs = {
   incoming_message: {
     in_progress_state: 'incoming_message_in_progress',
     finished_state: 'incoming_message_finished'
   }
}

queueRef.child('specs').set(queueSpecs)

let queue = new Queue(queueRef, {specId: 'incoming_message'}, function(data, progress, resolve, reject) {
  co(function*() {
    yield messageProcessor.process(data.data)
    return
  }).then(resolve).catch(reject)
})

export default function(message) {
  return co(function*() {
    return yield queueRef.child('tasks').push({data: message})
  })
}
