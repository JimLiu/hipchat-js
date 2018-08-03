import ConfigStore from 'stores/configuration_store';
import Room from 'core/models/room';
import User from 'core/models/user';
import DALError from 'core/models/dal-error';
import AppConfig from 'config/app_config';
import utils from 'helpers/utils';
import { SYNC_REQUEST_GZIP_SIZE } from 'core/common/constants';
import { gzip } from 'pako/lib/deflate';
import logger from 'helpers/logger';

/**
 * @module REST
 */
export default {

  /**
   * POST: https://{api_host}/v2/room
   *
   * @method createRoom
   * @param name
   * @param topic
   * @param privacy
   * @returns {Promise<Object, DALError>} - Object with room's "id" property
   */
  createRoom(name, topic, privacy) {
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      let url = `https://${ ConfigStore.get('api_host') }/v2/room`;

      let success = () => {
        let data = JSON.parse(request.responseText);
        data = data.entity ? data.entity : data;
        resolve(data);
      };
      let error = () => reject(DALError.fromJqXHR(request));

      // Status handler
      request.onreadystatechange = () => {
        if(request.readyState === 4) {
          let status = request.status;
          let isSuccess = status >= 200 && status < 300 || status === 304;
          if(isSuccess) {
            success();
          } else {
            error();
          }
        }
      };

      // Making request
      request.open('POST', url, true);
      request.setRequestHeader('Content-Type', 'application/json');
      request.setRequestHeader('Authorization', `Bearer ${ ConfigStore.get('oauth_token') }`);
      request.send(JSON.stringify({ name, topic, privacy }));
    });
  },

  /**
   * DELETE: https://{api_host}/v2/room/{id}
   * @param id
   * @returns {Promise<undefined,DALError>} - ajax returns 204 so no content in resolve
   */
  deleteRoom(id) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `https://${ ConfigStore.get('api_host') }/v2/room/${ id }`,
        type: 'DELETE',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ ConfigStore.get('oauth_token') }`
        },
        success: () => resolve(),
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      });
    });
  },

  /**
   * GET: https://{api_host}/v2/room/{id}
   *
   * @method fetchRoom
   * @param id
   * @returns {Promise<Room, DALError>}
   */
  fetchRoom(id) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `https://${ ConfigStore.get('api_host') }/v2/room/${ id }`,
        type: 'GET',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ ConfigStore.get('oauth_token') }`
        },
        success: (data) => resolve(Room.fromREST(data)),
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      });
    });
  },

  /**
   * PUT: https://{api_host}/v2/room/{id}/avatar
   *
   * @method uploadRoomAvatar
   * @param id
   * @param avatar - Base64 encoded image string without data URI/MimeType (Ex: "data:image/png;base64,")
   * @returns {Promise<Object, DALError>} - Object with room's "id" property
   */
  uploadRoomAvatar(id, avatar) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `https://${ ConfigStore.get('api_host') }/v2/room/${ id }/avatar`,
        type: 'PUT',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ ConfigStore.get('oauth_token') }`
        },
        data: JSON.stringify({avatar}),
        success: (data) => resolve({room_id: id}),
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      });
    });
  },

  /**
   * DELETE: https://{api_host}/v2/oauth/token/{token}
   *
   * @method revokeOAuthToken
   */
  revokeOAuthToken() {
  },

  /**
   * POST: https://{api_host}/v2/sync/users
   *
   * @method syncRoster
   * @params {Roster} cached - the cached roster
   * @returns {Promise<Array<User>, DALError>}
   */
  syncRoster(cached = {}) {
    return new Promise((resolve, reject) => {
      let fields = [
        'xmpp_jid',
        'name',
        'mention_name',
        'email',
        'title',
        'photo_url',
        // 'timezone', // this isn't actually useful
        'version',
        'is_guest'
      ].join(',');

      let knownUsers = _.transform(cached, (result, user, id) => {
        result[id] = user.version;
        return result;
      });

      let params = {
        url: `https://${ ConfigStore.get('api_host') }/v2/sync/users?auth_token=${ ConfigStore.getOAuthToken() }&expand=changedUsers&fields=${ fields }`,
        type: 'POST',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        data: JSON.stringify({ requireFullList: true, knownUsers }),
        success: (response) => {
          resolve(response.changedUsers.map(user => User.fromREST(user)));
        },
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      };

      if (params.data.length >= SYNC_REQUEST_GZIP_SIZE) {
        params.headers['Content-Encoding'] = 'gzip';
        params.data = gzip(params.data);
        params.processData = false;
      }

      $.ajax(params);
    });
  },

  /**
   * POST: https://{api_host}/v2/sync/rooms
   *
   * @method syncRooms
   * @params {RoomsList} cached - the cached rooms list
   * @returns {Promise<Array<Room>, DALError>}
   */
  syncRooms(cached = {}) {
    return new Promise((resolve, reject) => {
      let fields = [
        'xmpp_jid',
        'name',
        'privacy',
        'is_guest_accessible',
        'guest_access_url',
        'avatar_url',
        'is_archived',
        'topic',
        'version',
        'owner'
      ].join(',');

      let knownRooms = _.transform(cached, (result, room, id) => {
        // HW-1298 fix problem with cache on some old versions of HipChat server
        if (room.name){
          result[id] = room.version;
        }
        return result;
      });

      let params = {
        url: `https://${ ConfigStore.get('api_host') }/v2/sync/rooms?auth_token=${ ConfigStore.getOAuthToken() }&expand=changedRooms&fields=${ fields }`,
        type: 'POST',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        data: JSON.stringify({ requireFullList: true, knownRooms }),
        success: (response) => {
          resolve(response.changedRooms.map(room => Room.fromREST(room)));
        },
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      };

      if (params.data.length >= SYNC_REQUEST_GZIP_SIZE) {
        params.headers['Content-Encoding'] = 'gzip';
        params.data = gzip(params.data);
        params.processData = false;
      }

      $.ajax(params);
    });
  },

  /**
   * Update a room details
   * PUT: https://{api_host}/room/{room_id}
   *
   * @method updateRoomDetails
   */
  updateRoomDetails() {
  },

  /**
   * Fetch a list of participants in a room
   * GET: https://{api_host}/v2/room/{room_id}/participant
   *
   * @method fetchRoomParticipants
   */
  fetchRoomParticipants(roomId, includeOffline = true) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `https://${ ConfigStore.get('api_host') }/v2/room/${ roomId }/participant`,
        type: 'GET',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ ConfigStore.get('oauth_token') }`
        },
        data: {
          'include-offline': includeOffline,
          'expand': 'items',
          'max-results': AppConfig.room_participant_page_limit,
          'fields': 'is_guest,is_group_admin,xmpp_jid,group,name,mention_name,is_present_in_room'
        },
        success: (data) => resolve({roomId, participants: data.items}),
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      });
    });
  },

  /**
   * Fetch recent history for a room or chat
   * GET: https://{api_host}/user/{user_id}/history/latest
   * GET: https://{api_host}/room/{room_id}/history/latest
   *
   * @method fetchRecentHistory
   */
  fetchRecentHistory() {
  },

  /**
   * Upload a file to a room or chat
   * POST: https://{api_host}/room/{room_id}/share/file
   * POST: https://{api_host}/user/{user_id}/share/file
   *
   * @method sendFileMessage
   */
  sendFileMessage() {
  },

  /**
   * Send a private message to a user
   * POST: https://{api_host}/user/{user_id}/message
   *
   * @method sendPrivateMessage
   */
  sendPrivateMessage() {
  },

  /**
   * POST: https://{api_host}/addon/sync
   *
   * @method syncIntegrations
   */
  syncIntegrations() {
  },

  /**
   * GET: https://{api_host}/addon/signed-url/{room_id}/{addon_key}/{mod_type}/{key}/{addon_timestamp}
   *
   * @method getSignedUrl
   */
  getSignedUrl() {
  },

  /**
   * Calls getSignedUrl, then makes a GET request to it
   *
   * @method requestWithSignedUrl
   */
  requestWithSignedUrl() {
  },

  /**
   * Fetch the signed url for a secure file
   * GET: https://{api_host}/v2/file/{file_id}
   *
   * @method fetchSignedFile
   */
  fetchSignedFile(url) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ ConfigStore.get('oauth_token') }`
        },
        success: (data) => resolve(data),
        error: (jqXHR) => {
          const error = DALError.fromJqXHR(jqXHR);
          logger.error('[Secure files] Error while getting signed url', error);
          reject(DALError.fromJqXHR(jqXHR));
        }
      });
    });
  },

  /**
   * Fetch signed thumbnails for secure files
   * GET: https://{api_host}/v2/file/mget/thumbnails
   *
   * @param {Array} fileObjects
   * @method fetchSignedThumbnails
   */
  fetchSignedThumbnailCollection(fileObjects) {
    let url = `https://${ ConfigStore.get('api_host') }/v2/file/mget/thumbnails`;
    let ids = _.keys(fileObjects);

    return new Promise((resolve, reject) => {
      $.ajax({
        url,
        method: 'POST',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ ConfigStore.get('oauth_token') }`
        },
        data: JSON.stringify({ ids }),
        success: ({ files }) => {
          _.forIn(files, (value, key) => {
            if(!value) {
              logger.error(`[Secure files] Error while getting signed thumbnail for file with id ${key}`);
              fileObjects[key].errCb({ status: 400 });
            } else {
              fileObjects[key].cb(value);
            }
          });

          resolve(files);
        },
        error: (jqXHR) => {
          const error = DALError.fromJqXHR(jqXHR);

          logger.error('[Secure files] Error while getting signed thumbnails', error);
          _.forIn(fileObjects, (value) => {
            value.errCb(error);
          });
          reject(error);
        }
      });
    });
  },

  /**
   * GET: https://{api_host}/v2/video/token
   *
   * @returns {Promise}
   */
  fetchVideoToken(recipient_id = null, room_id = null) {
    let url = `https://${ ConfigStore.get('api_host') }/v2/video${recipient_id ? '/callee/' + recipient_id : ''}/token`;
    if (room_id) {
      url += `?room=${room_id}`;
    }
    return new Promise((resolve, reject) => {
      $.ajax({
        url,
        method: 'GET',
        type: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ ConfigStore.get('oauth_token') }`
        },
        success: (data, text, jqXHR) => {
          try {
            let parsed_response = JSON.parse(data);
            resolve(parsed_response);
          } catch (e) {
            reject(DALError.fromJqXHR(jqXHR));
          }
        },
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      });
    });
  },

  /**
   * Ensure that we have a network connection, hits features endpoint for btf, health-check for cloud
   * HEAD: https://{api_host}/v2/health-check
   */
  checkNetwork() {
    let url = _.get(ConfigStore.get('feature_flags'), 'btf', false) ? utils.url.featureFlagsAPI(ConfigStore.get('base_url')) : utils.url.networkCheckAPI(ConfigStore.get('api_host'));
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        type: 'HEAD',
        timeout: 10000,
        success: () => resolve(),
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      });
    });
  },

  fetchAlertFlag() {
    let url = `https://${ ConfigStore.get('api_host') }/v2/flag`;
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        method: 'GET',
        type: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ ConfigStore.get('oauth_token') }`
        },
        success: (data) => resolve(data),
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      });
    });
  },

  dismissAlertFlag({ id }) {
    let url = `https://${ ConfigStore.get('api_host') }/v2/flag/dismiss`;
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        method: 'POST',
        type: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ ConfigStore.get('oauth_token') }`
        },
        data: JSON.stringify({ id }),
        success: () => resolve(),
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      });
    });
  },

  fetchReadOnlyContent() {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: '/login_interstitial',
        type: 'GET',
        timeout: 10000,
        success: (data) => resolve(data),
        error: (jqXHR) => reject(DALError.fromJqXHR(jqXHR))
      });
    });
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/core/rest/rest.js
 **/