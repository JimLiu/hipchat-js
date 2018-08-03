import DALError from './models/dal-error';
import User from './models/user';
import Room from './models/room';
import Emoticon from './models/emoticon';
import BrowserStorage from './cache/browser_storage/browser_storage';
import * as Keys from './cache/browser_storage/browser_storage_keys';
import ConfigActions from 'actions/config_actions';
import * as NS from './xmpp/lib/namespaces';
import Compression from './cache/lib/compression';

const STORE = Symbol.for('DAL.Cache.BrowserStorage');

/**
 * @module DAL.Cache
 */
export class DALCache {

  constructor() {
    this[STORE] = null;

    /**
     * @property {object} Keys - dictionary of storage keys
     */
    this.Keys = Keys;
  }

  /**
   * Initializes the localStorage module. All reads/writes to storage
   * are blocked until this is properly called
   *
   * @method configure
   * @param {number} user_id
   * @param {number} group_id
   */
  configure(user_id, group_id) {
    if (_.isNumber(user_id) && _.isNumber(group_id)) {
      this[STORE] = new BrowserStorage(user_id, group_id);
      ConfigActions.cacheConfigured();
    }
  }

  /**
   * Async pass-through to BrowserStorage.has
   *
   * @method has
   * @param {string} key
   * @param {object} [options = { location: 'localStorage' }]
   * @returns {Promise<boolean,DALError>}
   */
  has(key, options = { location: BrowserStorage.Locations.LOCAL }) {
    return new Promise((resolve, reject) => {
      if (!this[STORE]) {
        return reject(DALError.ofType(DALError.Types.STORAGE_NOT_CONFIGURED));
      }
      resolve(this[STORE].has(key, options));
    });
  }

  /**
   * Async pass-through to BrowserStorage.get
   *
   * @method get
   * @param {string} key
   * @param {object} [options = { location: 'localStorage' }]
   * @returns {Promise<*,DALError>}
   */
  get(key, options = { location: BrowserStorage.Locations.LOCAL }) {
    return new Promise((resolve, reject) => {
      if (!this[STORE]) {
        return reject(DALError.ofType(DALError.Types.STORAGE_NOT_CONFIGURED));
      }
      resolve(Compression.rehydrate(key, this[STORE].get(key, options)));
    });
  }

  /**
   * Async pass-through to BrowserStorage.set
   *
   * @method set
   * @param {string} key
   * @param {*} val
   * @param {object} [options = { location: 'localStorage' }]
   * @returns {Promise<true,DALError>}
   */
  set(key, val, options = { location: BrowserStorage.Locations.LOCAL }) {
    return new Promise((resolve, reject) => {
      if (!this[STORE]) {
        return reject(DALError.ofType(DALError.Types.STORAGE_NOT_CONFIGURED));
      }
      resolve(this[STORE].set(key, Compression.dehydrate(key, val), options));
    });
  }

  /**
   * Async pass-through to BrowserStorage.unset
   *
   * @method unset
   * @param {string} key
   * @param {object} [options = { location: 'localStorage' }]
   * @returns {Promise<true,DALError>}
   */
  unset(key, options = { location: BrowserStorage.Locations.LOCAL }) {
    return new Promise((resolve, reject) => {
      if (!this[STORE]) {
        return reject(DALError.ofType(DALError.Types.STORAGE_NOT_CONFIGURED));
      }
      resolve(this[STORE].unset(key, options));
    });
  }

  /**
   * Async pass-through to BrowserStorage.clear
   *
   * @method clear
   * @returns {Promise<true,DALError>}
   */
  clear() {
    return new Promise((resolve, reject) => {
      if (!this[STORE]) {
        return reject(DALError.ofType(DALError.Types.STORAGE_NOT_CONFIGURED));
      }
      resolve(this[STORE].clear());
    });
  }

  /**
   * Updates the room cache with the provided array of Room Models.
   * Will either upsert or remove each provided room based on the
   * Room's is_deleted flag;
   *
   * @param {Array<Room>} updates - list of Room models
   * @returns {Promise<rooms,DALError>}
   */
  updateRooms(updates) {
    return this.get(Keys.ROOMS).then((cache) => {
      cache = cache || {};
      updates.forEach((room) => {
        if (room.is_deleted || room.is_archived) {
          if (!_.isNull(room.id)) {
            delete cache[room.id];
          } else {
            cache = _.omitBy(cache, (item) => item.jid === room.jid);
          }
        } else {
          cache[room.id] = room;
        }
      });
      return this.set(Keys.ROOMS, cache).then(() => cache);
    });
  }

  /**
   * Updates the roster cache with the provided array of User Models.
   * Will either upsert or remove each provided user based on the
   * User's is_deleted flag. Resolves to the updated roster
   *
   * @param {Array<User>} updates - list of User models
   * @returns {Promise<Roster, DALError>}
   */
  updateRoster(updates) {
    return this.get(Keys.ROSTER).then((cache) => {
      cache = cache || {};
      updates.forEach((user) => {
        if (user.is_deleted) {
          delete cache[user.id];
        } else {
          cache[user.id] = user;
        }
      });
      return this.set(Keys.ROSTER, cache).then(() => cache);
    });
  }

  updateEmoticons(update) {
    return this.get(Keys.EMOTICONS).then((cached) => {
      let items = update.query.item,
          cached_items = _.get(cached, 'query.item', null);

      if (cached_items && update.type !== 'result') {
        items = [].concat(cached_items, items);
        update.query.path_prefix = cached.query.path_prefix;
        update.query.ver = cached.query.ver;
      }
      update.query.item = _.uniqBy(items, 'id');
      return this.set(Keys.EMOTICONS, update).then(() => update);
    });
  }

  /**
   * Get the roster from the cache in the shape of an XMPP roster IQ query
   * TEMPORARY convenience method until we can eliminate the IQ processors
   * and allow the app to get the roster in it's cached state directly without
   * breaking the startup flow :(
   *
   * @method getRosterAsXMPP
   * @returns {Promise<XMPPRoster|null, DALError>}
   */
  getRosterAsXMPP() {
    return this.get(Keys.ROSTER).then((roster) => {
      if (roster) {
        return {
          iq: {
            query: {
              item: Object.keys(roster).map((id) => User.asX2JS(roster[id])),
              xmlns: NS.ROSTER
            },
            type: 'result',
            xmlns: NS.JABBER
          }
        };
      }
      return null;
    });
  }

  /**
   * Get the rooms list from the cache in the shape of an XMPP roster IQ query
   * TEMPORARY convenience method until we can eliminate the IQ processors
   * and allow the app to get the room list in it's cached state directly without
   * breaking the startup flow :(
   *
   * @method getRoomsAsXMPP
   * @returns {Promise<XMPPRoomsList|null, DALError>}
   */
  getRoomsAsXMPP() {
    return this.get(Keys.ROOMS).then((rooms) => {
      if (rooms) {
        return {
          iq: {
            query: {
              item: Object.keys(rooms).map((id) => Room.asX2JS(rooms[id])),
              xmlns: NS.DISCO_ITEMS
            },
            type: 'result',
            xmlns: NS.JABBER
          }
        };
      }
      return null;
    });
  }

  /**
   * Get the emoticons list from the cache in the shape of an XMPP emoticons IQ query
   *
   * @method getEmoticonsAsXMPP
   * @returns {Promise<XMPPEmoticonsList|null, DALError>}
   */
  getEmoticonsAsXMPP() {
    return this.get(Keys.EMOTICONS).then((iq) => {
      if (iq) {
        return {
          query: {
            item: iq.query.item.map(Emoticon.asX2JS),
            path_prefix: iq.query.path_prefix,
            xmlns: NS.HC_EMOTICONS
          },
          type: 'result',
          xmlns: NS.JABBER
        };
      }
      return null;
    });
  }

}

export default new DALCache();



/** WEBPACK FOOTER **
 ** ./src/js/core/dal.cache.js
 **/