import '../env-setup'
import { Model } from 'quickfire'
import UserContext from './UserContext'

import co from 'co'
import FB from '../FB'
import _ from 'lodash'

export default class User extends Model {
  static findWithFbid(fbid) {
    if (fbid == null) throw new Error('No fbid provided')

    let model = this
    return co(function*() {
      let currentUser = yield model.find(fbid)
      if (currentUser != null) return currentUser
      let profile = yield FB.api(fbid)
      return yield model.create(_.assign(profile, {id:fbid}))
    })
  }

  context() {
    let self = this
    return co(function*() {
      let ctx = yield UserContext.find(self.id)
      return ctx || (yield UserContext.create(self.val()))
    })
  }

  destroy() {
    let self = this
    let destroy = super.destroy.bind(this)
    return co(function*() {
      let ctx = yield self.context()
      yield ctx.destroy()
      return yield destroy()
    })
  }
}
