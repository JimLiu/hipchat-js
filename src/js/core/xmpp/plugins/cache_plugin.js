import AbstractPlugin from './abstract_plugin';
import User from 'core/models/user';
import Room from 'core/models/room';
import Emoticon from 'core/models/emoticon';
import DALCache from 'core/dal.cache';
import * as NS from '../lib/namespaces';
import { RECONNECT_SYNC_THRESHOLD } from 'core/common/constants';
import { create as createHash } from 'core/common/hash';

export default class CachePlugin extends AbstractPlugin {

  constructor(...args) {
    super(...args);
    this.disconnectedTimestamp = null;
  }


  init(...args) {
    super.init(...args);
    Strophe.addNamespace('HC_MUC_ROOM', NS.HC_MUC_ROOM);
    Strophe.addNamespace('HC_ROSTER_HASH', NS.HC_ROSTER_HASH);
    Strophe.addNamespace('HC_ROOMS_HASH', NS.HC_ROOMS_HASH);
    Strophe.addNamespace('HC_EMOTICONS', NS.HC_EMOTICONS);
  }

  /**
   * @override
   */
  onConnected() {
    this.Connection.addHandler(this.updateCacheFromRosterPush.bind(this), NS.ROSTER, 'iq', 'set');
    this.Connection.addHandler(this.updateCacheFromRoomPush.bind(this), NS.HC_MUC_ROOM, 'iq', 'set');
    this.Connection.addHandler(this.updateCacheFromEmoticonPush.bind(this), NS.HC_EMOTICONS, 'iq', 'set');
  }

  /**
   * @override
   */
  onDisconnected() {
    this.disconnectedTimestamp = new Date().getTime();
  }

  /*
   * Updates the Cached user list when roster pushes from the server are received.
   * If there is no cached roster currently, disregard. Pushes should not be
   * saved as the entire roster.
   */
  updateCacheFromRosterPush(xmpp) {
    DALCache.has(DALCache.Keys.ROSTER).then((hasRoster) => {
      if (!hasRoster) {
        return;
      }

      let query = xmpp.getElementsByTagNameNS(Strophe.NS.ROSTER, 'query')[0],
        items = query.querySelectorAll('item'),
        users = Array.from(items).map((item) => User.fromXMPP(item));
      return DALCache.updateRoster(users);
    }).catch(_.noop);
    return true;
  }

  /*
   * Updates the cached rooms list when room pushes from the server are received.
   * If there is no cached rooms list, disregard. Pushes should not be
   * saved as the entire list.
   */
  updateCacheFromRoomPush(xmpp) {
    DALCache.has(DALCache.Keys.ROOMS).then((hasRooms) => {
      if (!hasRooms) {
        return;
      }

      let query = xmpp.getElementsByTagNameNS(Strophe.NS.HC_MUC_ROOM, 'query')[0],
        items = query.querySelectorAll('item'),
        rooms = Array.from(items).map((item) => Room.fromXMPPMucRoom(item));
      return DALCache.updateRooms(rooms);
    }).catch(_.noop);
    return true;
  }

  /*
   * Updates the cached emoticons list when emoticon pushes from the server are received.
   * If there is no cached emoticons list, disregard. Pushes should not be
   * saved as the entire list.
   */
  updateCacheFromEmoticonPush(xmpp) {
    DALCache.has(DALCache.Keys.EMOTICONS).then((hasEmoticons) => {
      if (!hasEmoticons) {
        return;
      }

      let query = xmpp.getElementsByTagNameNS(Strophe.NS.HC_EMOTICONS, 'query')[0],
        items = query.querySelectorAll('item'),
        emoticons = Array.from(items).map((item) => Emoticon.fromXMPP(item));

      return DALCache.updateEmoticons({
        type: 'set',
        query: {
          item: emoticons
        }
      });
    }).catch(_.noop);
    return true;
  }

  /**
   * Determines if the `disconnected_time` is within the threshold that should
   * trigger syncing-on-reconnection
   *
   * @method isReconnectedWithinSyncThreshold
   * @returns {boolean}
   */
  isReconnectedWithinSyncThreshold() {
    let result = false,
      time_since_disconnected;

    if (_.isFinite(this.disconnectedTimestamp)) {
      time_since_disconnected = Date.now() - this.disconnectedTimestamp;
      result = time_since_disconnected < RECONNECT_SYNC_THRESHOLD;
    }

    return result;
  }

  /**
   * Checks to see if the provided version of the roster is in sync with
   * the server. If the provided cache is empty, resolves with false.
   * If not, will request the server hash value via xmpp and compare it
   * with the calculated hash value, and resolve with whether they match.
   *
   * @method isResourceInSync
   * @param {string} resource - either DAL.Cache.Keys.ROSTER or ROOMS
   * @param {string} cache - Roster or Rooms cache
   * @returns {Promise<boolean>}
   */
  isResourceInSync(resource, cache) {
    if (Object.keys(cache).length === 0) {
      return Promise.resolve(false);
    }
    return this.getResourceHash(resource).then((serverHash) => {

      let resourceList = Object.keys(cache).reduce(function (result, id) {
        if (!(cache[id].is_deleted || cache[id].is_archived)) {
          result.push({ id, version: cache[id].version });
        }
        return result;
      }, []);

      return createHash(resourceList) === serverHash;
    });
  }

  /**
   * Get the server version-hash of the roster or rooms list.
   * Returns a Promise that will resolve with either the hash
   * or null if an error occurred. Will not reject.
   *
   * <iq xmlns='jabber:client'
   *   to='1_4@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222'
   *   type='result'
   *   id='551ac781-4175-44a1-9fad-f5d5396b2244:sendIQ'>
   *     <query xmlns='http://hipchat.com/protocol/users#hash'>4118399e0e44423d602c8a804dddd672</query>
   * </iq>
   *
   * @method getResourceHash
   * @param {string} resource - 'roster' or 'rooms-wo-archived'
   * @returns {Promise<hash|null>}
   */
  getResourceHash(resource) {
    let xmlns = resource === DALCache.Keys.ROSTER ? Strophe.NS.HC_ROSTER_HASH : Strophe.NS.HC_ROOMS_HASH,
      type = 'get',
      use_full_list = true,
      stanza = $iq({ type }).c('query', { xmlns, use_full_list });

    return new Promise((resolve) => {
      let success = function (xmpp) {
        let query = xmpp.getElementsByTagNameNS(xmlns, 'query')[0];
        resolve(query ? query.textContent.trim() : null);
      };

      let error = function () {
        resolve(null);
      };

      this.Connection.sendIQ(stanza.tree(), success, error);
    });
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/cache_plugin.js
 **/