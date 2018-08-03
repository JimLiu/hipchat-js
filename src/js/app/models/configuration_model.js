import utils from 'helpers/utils';
import PreferencesModel from 'models/preferences_model';
import logger from 'helpers/logger';

/**
 * @class ConfigurationModel
 *
 * Authentication properties:
 *
 * @property {string} auth_method - 'oauth2' or 'nonce'
 * @property {string} [auth_nonce] - set if auth_method is nonce
 * @property {string} oauth_token - auth token for v2 api
 * @property {number} [oauth_token_expires_in] - milliseconds, provided in oauth mode. In nonce mode, provided token has 1 month expiry
 * @property {string} apiv1_token - auth token for v1 api
 * @property {number} apiv1_token_expires_in - milliseconds
 * @property {string} sid - Bosh session id
 *
 * Application urls & hosts:
 *
 * @property {string} base_url - defaults to empty string
 * @property {string} video_base_url - defaults to hipchat.com/video
 * @property {string} bind_url
 * @property {string} api_host
 * @property {string} conference_server
 * @property {string} chat_server
 * @property {string} web_server
 * @property {string} route
 * @property {string} invite_url
 * @property {string} group_invite_url
 * @property {string} video_chat_uri
 *
 * User Details:
 *
 * @property {string} jid
 * @property {number} user_id
 * @property {string} user_name
 * @property {number} group_id
 * @property {string} group_name
 * @property {string} mention
 * @property {boolean} is_admin
 * @property {boolean} is_guest
 * @property {string} email
 * @property {string} title
 * @property {string} photo_small
 * @property {string} photo_large
 * @property {string} group_avatar_url
 * @property {number} addlive_app_id
 *
 * Guest Details (only there if user is guest):
 *
 * @property {string} [guest_key]
 * @property {number} [room_id]
 * @property {string} [room_name]
 * @property {string} [room_jid]
 *
 * Client identifiers:
 *
 * @property {string} client_type
 * @property {string} client_subtype
 * @property {string} client_version_id
 * @property {string} client_os_version_id
 * @property {string} client_node
 *
 * Environment configuration:
 *
 * @property {string} asset_base_uri
 * @property {string} video_chat_enabled
 * @property {string} private_rooms_enabled
 * @property {string} guest_access_enabled
 * @property {string} html5_routing_enabled
 * @property {string} display_name
 * @property {object} ui
 * @property {object} app_config_overrides
 * @property {object} native_feature_flags
 * @property {object} log_to_file
 *
 * Dictionaries:
 *
 * @property {object} feature_flags
 * @property {object} emoticons
 * @property {object} smileys
 * @property {object} keyboard_shortcuts
 * @property {object} permissions
 * @property {object} plan
 * @property {PreferencesModel} preferences - See [PreferencesModel]{@link class:PreferencesModel}
 */

// Avatar url comes in sometimes with size identifer, sometimes without
// Make sure it's there and the right one. No need for 2000px avatar images
function normalizeAvatarUrl (url, absUrl) {
  let extensionRegex = /((_\d+)?(\.\w{3,4}))$/;
  if (absUrl && _.isString(absUrl)) {
    return absUrl.replace(extensionRegex, '_125$3');
  }
  if (_.isString(url)) {
    return url.replace(extensionRegex, '_125$3');
  }
  return url;
}

// The Big Switch. Go through each key and fix/properly coerce the value
function normalizeConfiguration (input) {
  return _.transform(input, (result, val, key, original) => {
    switch (key) {

      case 'access_token':
        result.oauth_token = val;
        break;

      // OAuth token provided in seconds. Add 5 and convert to milliseconds
      case 'expires_in':
        result.oauth_token_expires_in = (val + 5) * 1000;
        break;

      // API V1 token is an object. The token itself is optional (not in php init state) and
      // may be in the token or __text val depending on source. Expiry is a timestamp of
      // seconds since EPOCH. Need to convert to milliseconds from now (plus 5 seconds)
      case 'token':
        const expiration = parseInt(val.expiration, 10);
        const ttl = parseInt(val.ttl, 10);
        const serverTimestamp = (expiration - ttl) * 1000;
        let currentTimestamp = new Date().getTime();
        if (currentTimestamp > serverTimestamp){
          currentTimestamp = serverTimestamp;
          logger.warn('Local date might be wrong. Server date:', new Date(serverTimestamp));
        }
        result.apiv1_token = val.token || val.__text;
        result.apiv1_token = result.apiv1_token === 'false' ? null : result.apiv1_token;
        result.apiv1_token_expires_in = expiration * 1000 - currentTimestamp + 5000;
        break;

      case 'user_id':
      case 'group_id':
      case 'addlive_app_id':
      case 'room_id':
        result[key] = parseInt(val, 10);
        break;
      case 'group_invite_url':
        result['invite_url'] = val;
        break;
      case 'is_admin':
      case 'is_guest':
      case 'video_chat_enabled':
      case 'private_rooms_enabled':
      case 'guest_access_enabled':
      case 'html5_routing_enabled':
      case 'log_to_file':
        result[key] = utils.coerceBoolean(val);
        break;

      case 'prefs':
      case 'preferences':
        result.preferences = new PreferencesModel(val, true);
        break;

      case 'features':
        result.features = _.transform(val, (features, featureVal, featureKey) => {
          features[featureKey] = utils.coerceBoolean(featureVal);
        });
        break;

      case 'feature_flags':
        result.feature_flags = utils.features.reconcileFeatureFlags(original.native_feature_flags || {}, val);
        break;

      case 'native_feature_flags':
        result.native_feature_flags = _.isObject(val) ? val : {};
        break;

      case 'display_name':
        result.display_name = _.isString(val) ? val : "";
        break;

      // The following are returned from the server with different names from different sources
      case 'mention_name':
        result.mention = val;
        break;

      case 'name':
        result.user_name = val;
        break;

      case 'video_chat_uri':
        result.video_chat_uri = val;
        break;

      case 'video_base_url':
        result.video_base_url = val;
        break;

      case 'group_avatar_url':
      case 'group_absolute_avatar_url':
        result.group_avatar_url = normalizeAvatarUrl(original.group_avatar_url, original.group_absolute_avatar_url);
        break;

      // Ignored keys
      case 'xmlns':
      case 'anonymous':
      case 'el':
      case 'minimal':
      case 'mobile':
      case 'vertical_tabs':
      case 'welcome_msg':
      case 'onRefreshOAuthAccessToken':
      case 'source_json':
      case 'plan':
      case 'state':
      case 'token_type':
        break;

      default:
        result[key] = val;
    }
  });
}

export default class ConfigurationModel {
  constructor(input = Object.create(null)) {
    Object.assign(this, normalizeConfiguration(input));
  }
}



/** WEBPACK FOOTER **
 ** ./src/js/app/models/configuration_model.js
 **/