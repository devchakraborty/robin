import '../env-setup'
import {Model} from 'quickfire'

import co from 'co'
import extractor from 'unfluff'
import request from 'co-request'
import _ from 'lodash'

export default class Article extends Model {
  static createWithUrl({url, published_at}) {
    if (url == null) throw new Error('No url provided')
    if (published_at == null) throw new Error('No published_at provided')

    let model = this
    return co(function*() {
      let response = yield request(url)
      let data = JSON.parse(JSON.stringify(extractor(response.body)))
      return yield model.create(data)
    })
  }

  static getCurrent() {
    let model = this
    return co(function*() {
      return yield model.sample(5)
    })
  }
}
