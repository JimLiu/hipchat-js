import utils from 'helpers/utils';
import HJC from './hipchat';
import HCApi from './rest/apiv2/apiV2';
import REST from './rest/rest';
import ConnectionManager from './xmpp/connection_manager';
import DALCache from './dal.cache';
import VideoCallStrings from 'strings/video_call_strings';
import Presence from 'lib/enum/presence';
import User from './models/user';
import DALError from './models/dal-error';
import Room from './models/room';
import Emoticon from './models/emoticon';
import DALUser from './dal.user';
import DALRoom from './dal.room';
import DALEmoticon from './dal.emoticon';
import DALConnection from './dal.connection';

/**
 * Top level API for server communication. Passes through to HJC
 * until all of the HJC module have been rewritten and/or moved
 * to the xmpp, rest or internal_api modules.
 *
 * This should be the single entry point used in the app for server
 * communication. The long-term goal is to expand on this to also
 * include localStorage, and possibly analytics.
 *
 * @module DAL
 */
const DAL = {

  /**
   * Start up XMPP connection
   *
   * @method attemptConnect
   */
  attemptConnect() {
    ConnectionManager.connect();
  },

  /**
   * Resume a chat session after connection down
   *
   * @method attemptReconnect
   */
  attemptReconnect(resetAndReconnect = true) {
    ConnectionManager.reconnect(resetAndReconnect);
  },

  /**
   * Kill chat session
   *
   * @method terminateChatSession
   * @param {boolean} [shouldReconnect=true]
   */
  terminateChatSession(shouldReconnect = true) {
    ConnectionManager.disconnect(shouldReconnect);
  },

  /**
   * Send initial presence to the server to announce the client has connected
   *
   * @method sendInitialPresence
   * @param {string} [show = 'chat']
   * @returns {Promise<undefined>}
   */
  sendInitialPresence(show = Presence.AVAILABLE) {
    return ConnectionManager.Connection.Presence.sendInitialPresence(show);
  },

  /**
   * Change user presence/status
   *
   * @method setPresence
   * @param {string} [show = 'chat']
   * @param {string|null} [status = null]
   * @returns {Promise<undefined>}
   */
  setPresence(show = Presence.AVAILABLE, status = null) {
    return ConnectionManager.Connection.Presence.setPresence(show, status);
  },

  /**
   * Join a room
   *
   * @method joinRoom
   * @param {string} jid
   * @param {number} [maxstanzas=0]
   * @param {boolean} [limitPresences=true]
   * @returns {Promise<JoinRoomResponse, DALError>}
   */
  joinRoom(jid, maxstanzas = 0, limitPresences = true) {
    return ConnectionManager.Connection.Rooms.join(jid, maxstanzas, null, limitPresences);
  },

  /**
   * Join a one-to-one chat
   *
   * @method joinChat
   * @param {string} jid
   */
  joinChat(jid, cb = _.noop) {
    HJC.joinChat(jid, cb);
  },

  /**
   * Join a set of rooms
   *
   * @param {array} rooms - list of objects containing a JID {jid:'jid'}
   * @param {number} [maxstanzas=0]
   */
  joinRooms(rooms, maxstanzas = 0) {
    let map = rooms.reduce((result, room) => {
      if (utils.jid.is_room(room.jid)) {
        result.push(ConnectionManager.Connection.Rooms.join(room.jid, maxstanzas));
      } else {
        //TODO: need to refactor this method next to also return a promise and add it to promise map returned here
        HJC.joinChat(room.jid);
      }
      return result;
    }, []);
    return Promise.all(map);
  },

  /**
   * Leave a room/chat
   *
   * @param jid
   * @param {string} type - "chat" or "groupchat"
   * @returns {Promise<undefined,DALError>}
   */
  leaveRoom(jid, type) {
    if (type === 'groupchat') {
      return ConnectionManager.Connection.Rooms.leave(jid);
    }
    HJC.sendStateMessage(jid, type, 'gone');
    return Promise.resolve();
  },

  /**
   * Fetch a list of participants in a room
   *
   * @method fetchParticipants
   * @param {number} room id
   * @returns {Promise<Object, DALError>}
   */
  fetchParticipants(roomId, includeOffline = true) {
    return REST.fetchRoomParticipants(roomId, includeOffline);
  },

  /**
   * Fetch profile for a user
   *
   * @method fetchProfile
   * @param {string} jid
   * @param {function} [callback]
   */
  fetchProfile(jid, callback = _.noop) {
    HJC.fetchUserProfile(jid, callback);
  },

  /**
   * Fetch the history from the server
   *
   * @param {string} jid
   * @param {string|date} [before]
   * @param {number} [maxstanzas=50]
   * @param {number} id
   * @param {function} callback
   */
  fetchHistory (jid, before, maxstanzas = 50, id, callback = _.noop) {
    HJC.fetchHistory(jid, before, maxstanzas, id, callback);
  },

  /**
   * @method fetchRecentHistory
   * @param {object} data
   * @param {object} data.path
   * @param {string} data.path.type
   * @param {string|number} data.path.identifier - room or user id
   * @param {object} data.params - querystring / post body params
   * @param {function} [callback]
   */
  fetchRecentHistory(data, callback = _.noop) {
    if (data.path.type === 'user') {
      HCApi.user.recent_history(data, callback);
    } else {
      HCApi.room.recent_history(data, callback);
    }
  },

  /**
   * Fetch files for a room/chat
   *
   * @param {string} jid
   * @param {date} [before=null]
   * @param {number} [limit=50]
   * @returns {Promise<ChatFilesResponse, DALError>}
   */
  fetchFiles(jid, before = null, after = null, limit = 50) {
    return ConnectionManager.Connection.Chat.getFiles(jid, before, after, limit);
  },

  /**
   * Fetch links for a room/chat
   *
   * @param {string} jid
   * @param {date} [before=null]
   * @param {date} [after=null]
   * @param {number} [limit=50]
   * @returns {Promise<ChatLinksResponse, DALError>}
   */
  fetchLinks(jid, before = null, after = null, limit = 50) {
    return ConnectionManager.Connection.Chat.getLinks(jid, before, after, limit);
  },

  /**
   * Fetch presences for given users
   *
   * @method fetchPresences
   * @param {array} ids - list of user ids
   * @param {function} [callback]
   */
  fetchPresences(ids, callback = _.noop) {
    HJC.fetchPresence(ids, callback);
  },

  /**
   * Limit the presences you are subscribed to
   *
   * @method filterPresences
   * @param {Array<string|number>} ids - array of user ids
   * @returns {Promise<undefined,DALError>}
   */
  filterPresences(ids) {
    return ConnectionManager.Connection.Presence.filterPresences(ids);
  },

  /**
   * Sends a message
   *
   * @method sendMessage
   * @param {string} message
   * @returns {Promise}
   */
  sendMessage(message) {
    HJC.sendMessage(message);
  },

  /**
   * Edits a message
   *
   * @method editMessage
   * @param {string} jid message jid
   * @param {string} message edited message
   * @param {string} original_mid original message id
   * @param {ts} ts timestamp
   */
  editMessage(jid, message, original_mid, ts) {
    HJC.editMessage(jid, message, original_mid, ts);
  },

  /**
   * Deletes a message
   *
   * @method deleteMessage
   * @param {string} message the message to delete
   */
  deleteMessage(message) {
    HJC.deleteMessage(message);
  },

  /**
   * Send a state-change message
   *
   * @param {string} jid
   * @param {string} type
   * @param {string} state
   */
  sendStateMessage(jid, type, state) {
    HJC.sendStateMessage(jid, type, state);
  },

  /**
   * @method sendVideoMessage
   * @param {string} jid
   * @param {string} [type='call']
   * @param {boolean} [audioOnly=false]
   * @param {string} [url]
   * @param {string} [service]
   * @param {function} [callback=_.noop]
   * @param {string} reason
   */
  sendVideoMessage(jid, type = 'call', audioOnly = false, url, service, callback = _.noop, reason) {
    HJC.sendVideoMessage({jid, type, audioOnly, url, service, callback, reason});
  },

  /**
   * @method sendEnsoInviteMessage
   * @param {string} jid
   * @param {string} url
   */
  sendEnsoInviteMessage(jid, url) {
    let message = `<a href="${url}" data-target-options="enso_invite">${VideoCallStrings.join_video_call_message}</a>`;
    HCApi.user.send_private_message({
      path: {
        identifier: utils.jid.user_id(jid)
      },
      params: {
        message: message,
        notify: false,
        message_format: 'html'
      }
    });
  },

  /**
   * @method sendFile
   * @param {string} jid
   * @param {object} uploadData
   * @param {object} uploadData.path
   * @param {string} uploadData.path.identifier - room id
   * @param {object} uploadData.params
   * @param {file|object} uploadData.params.file
   * @param {string} uploadData.params.fileName
   * @param {string} uploadData.params.message
   * @param {string} uploadData.params.progressBarSelector
   * @param {function} uploadData.params.success
   * @param {function} uploadData.params.error
   */
  sendFileMessage(jid, uploadData) {
    if (utils.jid.is_private_chat(jid)) {
      return HCApi.user.share_file(uploadData);
    }

    return HCApi.room.share_file(uploadData);
  },

  /**
   * @method requestAddliveCredentials
   * @param {string} jid
   * @param {function} [callback]
   */
  requestAddliveCredentials(jid, callback = _.noop) {
    HJC.requestAddliveCredentials(jid, callback);
  },

  /**
   * @method clearWebCookies
   * @param {function} [callback]
   */
  clearWebCookies(callback = _.noop) {
    HJC.clearWebCookies(callback);
  },

  /**
   * Fetch a current API V1 token from server
   *
   * @method updateAPIV1Token
   * @return {promise}
   */
  updateAPIV1Token() {
    return ConnectionManager.updateApiV1Token();
  },

  /**
   * Revoke oauth2 token
   *
   * @method revokeOauth2Token
   * @param callback
   */
  revokeOauth2Token(callback = _.noop) {
    HJC.revokeOauth2Token(callback);
  },

  /**
   * @method inviteUsersToRoom
   * @param {string} roomJid
   * @param {array} userJids
   * @param {function} [callback]
   */
  inviteUsersToRoom(roomJid, userJids, callback = _.noop) {
    HJC.inviteUsersToRoom(roomJid, userJids, callback);
  },

  /**
   * @method removeUsersFromRoom
   * @param {string} roomJid
   * @param {array} userJids
   * @param {function} [callback]
   */
  removeUsersFromRoom(roomJid, userJids, callback = _.noop) {
    HJC.removeUsersFromRoom(roomJid, userJids, callback);
  },

  /**
   * @method savePreferences
   * @param {object} prefs
   * @param {function} [callback]
   */
  savePreferences(prefs, callback = _.noop) {
    HJC.savePreferences(prefs, callback);
  },

  /**
   * @method fetchReadstate
   * @param {function} [callback]
   */
  fetchReadstate() {
    HJC.readstate.fetch();
  },

  /**
   * @method updateReadstate
   * @param {object} data
   */
  updateReadstate(data) {
    HJC.readstate.update(data);
  },

  /**
   * @method removeReadstate
   * @param {object} data
   */
  removeReadstate(data) {
    HJC.readstate.remove(data);
  },

  /**
   * @method retryReadstate
   */
  retryReadstate() {
    HJC.readstate.retry();
  },

  /**
   * @method resetReadstate
   */
  resetReadstate() {
    HJC.readstate.reset();
  },

  /**
   * @method syncIntegrations
   * @param {object} data
   * @param {object} data.integrations
   * @param {object} data.room_ids
   * @param callback
   */
  syncIntegrations(data, callback = _.noop) {
    HCApi.integrations.sync(data, callback);
  },

  /**
   * @method getSignedUrl
   * @param {object} data
   * @param {string} data.extension
   * @param {string} [data.attribute=url]
   * @param {object} params - query params
   * @param {function} [callback]
   */
  getSignedUrl(data, params, callback = _.noop) {
    HCApi.integrations.getSignedUrl(data, params, callback);
  },

  /**
   * @method requestWithSignedUrl
   * @param {object} data
   * @param {object} params
   * @param {function} [callback]
   */
  requestWithSignedUrl(data, params, callback = _.noop) {
    HCApi.integrations.requestWithSignedUrl(data, params, callback);
  },

  /**
   * @method fetchAllGlancesForRoom
   * @param {object} data
   * @param {function} [callback]
   */
  fetchAllGlancesForRoom(data, callback = _.noop) {
    HCApi.integrations.fetchAllGlancesForRoom(data, callback);
  },

  /**
   * @method fetchSignedFile
   * @param {string} url
   * @return {promise}
   */
  fetchSignedFile(url) {
    return REST.fetchSignedFile(url);
  },

  /**
   * @method fetchSignedThumbnailCollection
   * @param {Object} fileObjects
   * @returns {promise}
   */
  fetchSignedThumbnailCollection(fileObjects) {
    return REST.fetchSignedThumbnailCollection(fileObjects);
  },

  /**
   * @method checkNetwork
   * @return {promise}
   */
  checkNetwork() {
    return REST.checkNetwork();
  },

  /**
   * @method isConnected
   * @return {boolean}
   */
  isConnected() {
    return ConnectionManager.isConnected();
  },

  /**
   * @method fetchVideoToken
   */
  fetchVideoToken(recipient_id, room_id) {
    return REST.fetchVideoToken(recipient_id, room_id);
  },

  /**
   * @method fetchAlertFlags
   */
  fetchAlertFlag() {
    return REST.fetchAlertFlag();
  },

  /**
   * @method dismissAlertFlag
   */
  dismissAlertFlag(data) {
    return REST.dismissAlertFlag(data);
  },

  /**
   * @method fetchReadOnlyContent
   */
  fetchReadOnlyContent() {
    return REST.fetchReadOnlyContent();
  }
};

DAL.User = DALUser;
DAL.Cache = DALCache;
DAL.Room = DALRoom;
DAL.Emoticon = DALEmoticon;
DAL.Connection = DALConnection;

DAL.Models = {
  Room,
  User,
  Emoticon,
  DALError
};

export default DAL;



/** WEBPACK FOOTER **
 ** ./src/js/core/dal.js
 **/