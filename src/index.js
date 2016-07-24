import express from 'express'
import bodyParser from 'body-parser'
import logger from 'express-logger'
import co from 'co'
import messageReceiver from './messaging/messageReceiver'
import {install} from 'source-map-support'
install()

let app = express()
app.use(bodyParser.json())
app.use(logger({path:'/dev/stdout'}))

app.get('/facebook/webhook', (req, res) => {
  if (req.query['hub.mode'] == 'subscribe' && req.query['hub.verify_token'] == process.env.FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge'])
  } else {
    res.status(403).end()
  }
})

app.post('/facebook/webhook', (req, res) => {
  co(function*() {
    yield messageReceiver.receive(req.body)
    res.status(200).end()
  })
})

app.listen(process.env.PORT || 3000)
