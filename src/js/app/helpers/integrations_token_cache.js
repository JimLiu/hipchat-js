import AppDispatcher from 'dispatchers/app_dispatcher';
import DAL from 'core/dal';
import JWT from 'helpers/jwt';
import logger from 'helpers/logger';
import {event_names} from 'keys/integrations_keys';

const MIN_CLEANUP_INTERVAL = 60000; // 1 minute

class TokenCache {

  constructor() {
    this.cache = {};
    this._pruneCacheThrottled = _.throttle(this._pruneCache, MIN_CLEANUP_INTERVAL);
    AppDispatcher.register(event_names.ON_INTEGRATIONS_UPDATE_SUMMARY, updateSummary => this._clear(updateSummary));
  }

  getToken(extension, roomId) {
    this._pruneCacheThrottled();
    return new Promise((resolve, reject) => {
      let jwt = this._get(extension, roomId);
      if (jwt && !jwt.expiresSoon()) {
        resolve(jwt);
      } else {
        DAL.getSignedUrl({extension, room_id: roomId}, {}, (responseData, response) => {
          if (responseData && !responseData.error && response.status < 400) {
            try {
              jwt = this._set(extension, roomId, responseData.jwt);
              resolve(jwt);
            } catch (e) {
              logger.error('[HC-Integrations]', `Invalid token (${responseData.jwt}): ${e.message}`);
              reject();
            }
          } else {
            let message = `Error while fetching token (${response.status})`;
            logger.error('[HC-Integrations]', message, responseData);
            reject();
          }
        });
      }
    });
  }

  _get(extension, roomId) {
    return _.get(this.cache, [roomId, extension.addon_key, extension.key]);
  }

  _set(extension, roomId, rawToken) {
    let jwt = JWT.parse(rawToken);
    _.set(this.cache, [roomId, extension.addon_key, extension.key], jwt);
    return jwt;
  }

  _pruneCache() {
    this.cache = _.mapValues(this.cache, addons => {
      return _.mapValues(addons, extensions => {
        return _.omitBy(extensions, jwt => jwt.isExpired());
      });
    });
    this.cache = _.omitBy(this.cache, addons => _.isEmpty(addons));
    logger.debug('[HC-Integrations]', 'Token cache pruned', this.cache);
  }

  _clear(updateSummary) {
    _.forOwn(updateSummary, ([removed, updated], roomId) => {
      let addonsCollection = _.flatten([removed, updated]);
      let changedAddonKeys = _.map(addonsCollection, addon => addon.addon_key);
      let roomIds = 'global' === roomId ? _.keys(this.cache) : [roomId];
      _.each(roomIds, id => {
        let addons = _.get(this.cache, [id], {});
        _.set(this.cache, [id], _.omit(addons, changedAddonKeys));
      });
      logger.debug('[HC-Integrations]', `Token invalidated for ${changedAddonKeys}`, this.cache);
    });
  }

}

export default new TokenCache();



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/integrations_token_cache.js
 **/