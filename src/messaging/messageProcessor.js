import co from 'co'
import RiveScript from 'rivescript'
import _ from 'lodash'
import natural from 'natural'
import moment from 'moment'
import Article from '../models/Article'
import Media from '../models/Media'
import User from '../models/User'
import queueOutgoingMessage from './outgoingMessageQueue'

const CONTEXT_FLAGS = ['quickReplies', 'sendArticles', 'sendAgain', 'rawMessage']
const BOT_WPM = 300

let bot = new RiveScript()
bot.loadDirectory('brain', () => {
  bot.sortReplies()
})

bot.setSubroutine('quickReply', (rs, [text]) => {
  let currentUser = rs.currentUser()
  let vars = rs.getUservars(currentUser)
  let quickReplies = vars.quickReplies || []
  quickReplies.push(text)
  rs.setUservars(currentUser, {quickReplies: quickReplies})
  return ''
})

bot.setSubroutine('sendArticles', (rs) => {
  let currentUser = rs.currentUser()
  rs.setUservars(currentUser, {sendArticles: true})
  return ''
})

bot.setSubroutine('sendAgain', (rs) => {
  let currentUser = rs.currentUser()
  rs.setUservars(currentUser, {sendAgain: true})
  return ''
})

bot.setSubroutine('storeArticle', (rs) => {
  return new rs.Promise((resolve, reject) => {
    co(function*() {
      let currentUser = rs.currentUser()
      let vars = rs.getUservars(currentUser)
      try {
        let article = yield Article.createWithUrl({
          url: vars.raw_message,
          published_at: new Date().getTime()
        })
      } catch (err) {
        console.error(err)
        return 'Unable to store article. Check that database is up and URL is well-formed.'
      }
      return 'Stored article.'
    }).then(resolve).catch(reject)
  })
})

bot.setSubroutine('sendImage', (rs, [url]) => {
  let currentUser = rs.currentUser()
  let vars = rs.getUservars(currentUser)
  let images = vars.sendImages || []
  images.push(url)
  rs.setUservars(currentUser, {sendImages: images})
  return ''
})

bot.setSubroutine('sendMedia', (rs) => {
  return new rs.Promise((resolve, reject) => {
    co(function*() {
      let currentUser = rs.currentUser()
      let vars = rs.getUservars(currentUser)
      let media = yield Media.getCurrent()
      rs.setUservars(currentUser, {sendImages: _.map(media, item => item.val().url)}) // TODO: could be links
      return ''
    }).then(resolve).catch(reject)
  })
})

bot.setSubroutine('clear', (rs, [userId]) => {
  return new rs.Promise((resolve, reject) => {
    co(function*() {
      try {
        console.log('clear', userId)
        if (userId == null) userId = rs.currentUser()
        let user = yield User.find(userId)
        let val = user.val()
        yield user.destroy()
        return `Cleared user ${userId} <${val.first_name} ${val.last_name}>.`
      } catch (err) {
        console.error(err)
        reject(err)
      }
    }).then(resolve).catch(reject)
  })
})

function buildMessages(reply, vars) {
  return co(function*() {
    let lines = reply.trim().split('\n')
    let messages = lines.map((line, i) => {
      let data = {
        recipient: {
          id: vars.id
        },
        message: {
          text: line
        }
      }
      if (i == lines.length - 1 && vars.quickReplies) {
        data.message.quick_replies = vars.quickReplies.map((quickReply) => {
          return {
            content_type: 'text',
            title: quickReply,
            payload: quickReply
          }
        })
      }
      return data
    })

    if (vars.sendArticles) {
      let articles = yield Article.getCurrent()
      let data = {
        recipient: {
          id: vars.id
        },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: articles.map((article) => {
                let val = article.val()
                let data = {
                  title: val.title,
                  image_url: val.image,
                  subtitle: val.description,
                  buttons: [
                    {
                      type: 'web_url',
                      url: val.canonicalLink,
                      title: 'Visit Website'
                    }
                  ]
                }
                if (article.description || article.summary) {
                  data.buttons.push({
                    type: 'postback',
                    title: 'TL;DR',
                    payload: `summarize ${article.id}`
                  })
                }
              })
            }
          }
        }
      }
      messages.push(data)
    }

    if (vars.sendImages) {
      let images = vars.sendImages
      images.forEach((image) => {
        messages.push({
          recipient: {
            id: vars.id
          },
          message: {
            attachment: {
              type: "image",
              payload: {
                url: image
              }
            }
          }
        })
      })
    }

    return messages
  })
}

const DEFAULT_NUM_WORDS = 10
function timeMessage(message) {
  let words = DEFAULT_NUM_WORDS
  if (message.message.text) {
    words = (new natural.WordTokenizer()).tokenize(message.message.text).length
  }
  return words / BOT_WPM * 60 * 1000
}

function processMessage(message) {
  return co(function* () {
    let text = _.get(message, 'message.text')
    let senderId = _.get(message, 'sender.id')

    let user = yield User.findWithFbid(senderId)
    let contextWrapper = yield user.context()
    var context = contextWrapper.val()

    let outgoingMessages = []
    do {
      context = _.omit(context, CONTEXT_FLAGS)
      context.raw_message = text
      bot.clearUservars(user.id)
      bot.setUservars(user.id, context)
      let reply = yield bot.replyAsync(user.id, text)
      context = bot.getUservars(user.id)
      outgoingMessages = outgoingMessages.concat(yield buildMessages(reply, context))
    } while (context.sendAgain)

    context = _.omit(context, CONTEXT_FLAGS)
    yield contextWrapper.set(context)

    console.log('queuing replies', outgoingMessages)

    var sendAt = moment()
    for (let outgoingMessage of outgoingMessages) {
      sendAt.add(timeMessage(outgoingMessage), 'ms')
      console.log('send at', sendAt.diff(moment(), 'seconds'), outgoingMessage)
      yield queueOutgoingMessage({
        send_at: sendAt.valueOf(),
        data: JSON.parse(JSON.stringify(outgoingMessage))
      })
    }
  })
}

export default {
  process: processMessage
}
