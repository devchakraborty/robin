import '../env-setup'
import {Model} from 'quickfire'

import co from 'co'

export default class Media extends Model {
  static getCurrent() {
    let model = this
    return co(function*() {
      return yield model.sample(5)
    })
  }
}
