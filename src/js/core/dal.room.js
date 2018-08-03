import DALSync from './dal.sync';
import DALCache from './dal.cache';
import XMPPUtils from './xmpp/lib/xmpp-utils';
import ConnectionManager from './xmpp/connection_manager';
import REST from './rest/rest';
import HCApi from './rest/apiv2/apiV2';
import Room from './models/room';
import * as NS from './xmpp/lib/namespaces';
import ConfigStore from 'stores/configuration_store';
import Logger from 'helpers/logger';

/**
 * Dictionary object of User models keyed by their id
 * @typedef {Object.<string, Room>} RoomsList
 */

/**
 * XMPP representation of rooms list, as received by roster IQ and
 * parsed via x2js
 * @typedef {Object} XMPPRoomsList
 * @property {Object} iq
 * @property {Object} iq.query
 * @property {Array<User>} iq.query.item
 * @property {string} iq.query.xmlns - 'http://jabber.org/protocol/disco#items'
 * @property {string} iq.xmlns - 'jabber:client'
 * @property {string} iq.type - 'result'
 */

/**
 * @module DALUser
 */
const DALRooms = {

  /**
   * Create a new room. Will attempt REST, but fallback
   * to XMPP if the REST API requests fail
   *
   * @method createRoom
   * @param {string} name
   * @param {string} topic
   * @param {string} privacy
   * @returns {Promise<Room, DALError>}
   */
  create(name, topic, privacy) {

    let createNewRoom = () => REST.createRoom(name, topic, privacy)
      .catch(() => ConnectionManager.Connection.Rooms.create(name, topic, privacy));

    let fetchRoomDetails = (entity) => this.getById(entity.id)
      .catch(() => this.getByJid(XMPPUtils.createRoomJid(name)));

    // Putting room creation via Coral behind a feature flag until we're confident
    // that this doesn't cause any unnecessary load on Coral
    if (_.get(ConfigStore.get('feature_flags'), 'web_client_coral_room_creation', false)) {
      return createNewRoom().then(fetchRoomDetails);
    }

    return ConnectionManager.Connection.Rooms.create(name, topic, privacy)
      .then(() => this.getByJid(XMPPUtils.createRoomJid(name)));
  },

  /**
   * Delete a room
   *
   * @method deleteRoom
   * @param {number} id
   * @param {string} jid
   * @returns {Promise<undefined, DALError>}
   */
  delete(id, jid) {
    return REST.deleteRoom(id)
      .catch((err) => {
        Logger.error('[REST:delete-room]', err);
        return ConnectionManager.Connection.Rooms.delete(jid);
      });
  },

  /**
   * Fetch a room by it's id
   *
   * @method fetchRoomById
   * @param {int} id
   * @returns {Promise<Room, DALError>}
   */
  getById(id) {
    return REST.fetchRoom(id).then((room) => {
      DALCache.updateRooms([ room ]);
      return room;
    });
  },

  /**
   * Fetch a room by it's jid
   *
   * @method fetchRoomByJid
   * @param {string} jid
   * @returns {Promise<Room, DALError>}
   */
  getByJid(jid) {
    return ConnectionManager.Connection.Rooms
      .fetch(jid)
      .then((room) => {
        DALCache.updateRooms([ room ]);
        return room;
      });
  },

  /**
   * Change a room's privacy setting
   *
   * @method setRoomPrivacy
   * @param {string} jid
   * @param {string} privacy
   * @returns {Promise<undefined,DALError>}
   */
  setPrivacy(jid, privacy) {
    return ConnectionManager.Connection.Rooms.setPrivacy(jid, privacy);
  },

  /**
   * Change a room's name
   *
   * @method renameRoom
   * @param {string} jid
   * @param {string} name
   * @returns {Promise<undefined,DALError>}
   */
  rename(jid, name) {
    return ConnectionManager.Connection.Rooms.rename(jid, name);
  },

  /**
   * Set room topic
   *
   * @method setTopic
   * @param {string} jid
   * @param {string} topic
   * @returns {Promise<undefined, DALError>}
   */
  setTopic(jid, topic) {
    return ConnectionManager.Connection.Rooms.setTopic(jid, topic);
  },

  /**
   * Set guest access on a room
   *
   * @method setGuestAccess
   * @param {string} jid
   * @param {boolean} enabled
   * @returns {Promise<undefined,DALError>}
   */
  setGuestAccess(jid, enabled) {
    return ConnectionManager.Connection.Rooms.setGuestAccess(jid, enabled);
  },

  /**
   * Update room details via REST. Currently looks to only be
   * used to archive/unarchive rooms - but could possibly be
   * used to rename, change topic/privacy as well.
   *
   * @method updateRoom
   * @param data
   *
   * @param callback
   */
  update(data, callback = _.noop) {
    HCApi.room.update_room(data, callback);
  },

  /**
   * Change a room's avatar
   *
   * @param {number} id
   * @param {string} avatar - Base 64 encoded image string
   * @return {promise}
   */
  uploadAvatar(id, avatar) {
    return REST.uploadRoomAvatar(id, avatar);
  },

  /**
   * Temporary method to get the rooms list in the expected structure of a
   * "download the world" disco#items IQ XMPP request (ughh)
   *
   * @method getRoomsAsXMPP
   * @returns {Promise<XMPPRoster, DALError>}
   */
  getRoomsAsXMPP() {
    return this.getRoomsList().then((rooms) => {
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
    });
  },

  /**
   * Gets the complete list of rooms. Attempts to sync using the cache
   * so that it only downloads what it needs.
   *
   * @method getRoomsList
   * @returns {Promise<RoomsList, DALError>}
   */
  getRoomsList() {
    return DALSync.getRoomsList();
  }

};

export default DALRooms;


/** WEBPACK FOOTER **
 ** ./src/js/core/dal.room.js
 **/