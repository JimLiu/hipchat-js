import utils from 'helpers/utils';

/**
 * @class CurrentUserModel
 *
 * @property {string} email
 * @property {string} guest_key
 * @property {boolean} is_admin
 * @property {boolean} is_guest
 * @property {string} jid
 * @property {string} mention
 * @property {string} photo_large
 * @property {string} photo_small
 * @property {string} title
 * @property {number} user_created_utc
 * @property {number} user_id
 * @property {string} user_name
 * @property {string} show
 * @property {string} status
 */

function normalizeCurrentUser (input) {
  return _.transform(input, (result, val, key) => {
    switch (key) {

      case 'email':
      case 'guest_key':
      case 'mention':
      case 'photo_large':
      case 'photo_small':
      case 'title':
      case 'show':
      case 'status':
      case 'is_in_welcome_range':
        result[key] = val;
        break;

      case 'user_name':
      case 'name':
        result.user_name = val;
        break;

      case 'jid':
      case 'user_jid':
        result.jid = val;
        break;

      case 'user_created_utc':
        result[key] = !_.isNaN(val) ? parseInt(val, 10) : null;
        break;

      case 'user_id':
      case 'id':
        result.id = !_.isNaN(val) ? parseInt(val, 10) : null;
        break;

      case 'is_admin':
      case 'is_guest':
        result[key] = utils.coerceBoolean(val, false);
        break;

      case 'presence':
        result.show = val.show;
        result.status = val.status;
        break;
    }
  });
}


export default class CurrentUserModel {
  constructor(input = Object.create(null)) {
    Object.assign(this, normalizeCurrentUser(input));
  }
}



/** WEBPACK FOOTER **
 ** ./src/js/app/models/current_user_model.js
 **/