import utils from 'helpers/utils';
import * as Constants from './common/constants';
import Logger from 'helpers/logger';
import ConnectionManager from './xmpp/connection_manager';
import ReadState from './rest/readstate';
import ConfigStore from 'stores/configuration_store';
import x2js from './common/x2js';
import AppDispatcher from 'dispatchers/app_dispatcher';
import VideoCallStrings from 'strings/video_call_strings';

var noop = function() { return {}; };
var isNil = function(val) {
  return val === null || val === undefined;
};

/**
 * HipChat Client
 */
class HipChat {
  /**
   * Creates an instance of the HipChat client that interacts with HipChat's XMPP
   * service via BOSH
   * @returns {object}      HipChat instance
   */
  constructor() {

    /**
     * config contains all of the properties needed to connect to an HC server
     *
     * For nonce based auth (web/session based), the following are required:
     *
     *   * auth_method = 'nonce'
     *   * auth_nonce: nonce value used to validate auth. Issued by web
     *   * jid: user's jid
     *   * user_id
     *   * route: xmpp route (e.g., xmpp:devvm.hipchat.com:5222)
     *   * bind_url: BOSH end-point (e.g. https://likeabosh.hipchat.com/http-bind/)
     *   * chat_server: XMPP end-point (e.g. chat.hipchat.com)
     *
     * For oauth2 based auth, the following are required:
     *
     *   * auth_method = 'oauth2'
     *   * access_token: OAuth2 access token obtained through 3LO dance
     *   * jid: user's jid
     *   * user_id
     *   * route: xmpp route (e.g., xmpp:devvm.hipchat.com:5222)
     *   * bind_url: BOSH end-point (e.g. https://likeabosh.hipchat.com/http-bind/)
     *   * chat_server: XMPP end-point (e.g. chat.hipchat.com)
     *
     * @type {object}
     * @required
     */

    // instance properties
    this.cached_profiles = {};
    this.savePrefsAttempts = 0;
    this.savePrefsRetryDelay = Constants.RECONNECT_DELAY_MS;

    /**
     * @deprecated
     * @type {ReadState}
     */
    this.readstate = new ReadState({
      fetchCallback: (err, data) => {
        AppDispatcher.dispatch('DAL:readstate-fetched', err, data);
      },
      patchCallBack: (err, data) => {
        AppDispatcher.dispatch('DAL:readstate-patched', err, data);
      }
    });

    AppDispatcher.registerOnce({
      'DAL:cache-configured': () => {
        this.readstate.loadStorage();
      }
    });

    this.parsedCallback = (data, once, cb) => {
      if (typeof once === 'function') {
        cb = once;
        once = false;
      }
      cb(data);
      return !once;
    };

    this.sendIQ = (stanza, cb) => {
      // Wer're just passing the same thing through in both cases here... combine?
      return ConnectionManager.sendIQ(stanza.tree(), (data) => {
        return this.parsedCallback(x2js.xml2json(data), cb);
      }, (err) => {
        return this.parsedCallback(x2js.xml2json(err), cb);
      });
    };

    this.subscribe = (evt, once, opts, cb) => {
      var from, id, ns, type;
      if (isNil(once)) {
        once = false;
      }
      if (isNil(opts)) {
        opts = null;
      }
      switch(evt) {
        case 'roomChange':
          evt = 'iq';
          type = 'set';
          ns = 'http://hipchat.com/protocol/muc#room';
          break;
        case 'presenceError':
          evt = 'presence';
          type = 'error';
          ns = 'http://jabber.org/protocol/muc#room';
          break;
        case 'joinRoom':
          evt = 'presence';
          type = null;
          ns = null;
          break;
        case 'videoMessage':
          evt = 'message';
          type = null;
          ns = null;
        default:
          type = null;
          ns = null;
      }
      if (opts) {
        id = opts.id;
        from = opts.from;
      }
      return ConnectionManager.addHandler((data) => {
        var jsonified_data = x2js.xml2json(data);
        return this.parsedCallback(jsonified_data, once, cb);
      }, ns, evt, type, id, from);
    };

    this.toXMPPDate = (dttm) => {
      if (typeof dttm === 'string') {
        return dttm;
      }
      return (new Date(dttm.setMilliseconds(0))).toISOString().replace(/\.000/, '');
    };

    this.getJidType = (jid) => {
      var re;
      re = new RegExp(ConfigStore.get('conference_server'));
      if (re.test(jid)) {
        return 'groupchat';
      }
      return 'chat';
    };
  }

  on(evt, opts, cb = noop) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = null;
    }
    return this.subscribe(evt, false, opts, cb);
  }

  once(evt, opts, cb = noop) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = null;
    }
    return this.subscribe(evt, true, opts, cb);
  }

  off(subscriptionRef) {
    return ConnectionManager.deleteHandler(subscriptionRef);
  }

  /**
   * @deprecated
   */
  fetchPresence(uid, cb = _.noop) {
    var stanza;
    if (isNil(uid)) {
      uid = [];
    }
    if (!Array.isArray(uid)) {
      uid = [uid];
    }
    stanza = $iq({
      type: 'get'
    }).c('query', {
      xmlns: 'http://hipchat.com/protocol/presence'
    });
    uid.forEach((id) => {
      return stanza.c('uid', id).up();
    });
    return this.sendIQ(stanza, cb);
  }

  /**
   * @deprecated
   */
  inviteUsersToRoom(room_jid, user_jids, reason, id) {
    var attrs, node;
    if (isNil(user_jids)) {
      user_jids = [];
    }
    if (isNil(reason)) {
      reason = '';
    }
    if (isNil(id)) {
      id = null;
    }
    if (!Array.isArray(user_jids)) {
      user_jids = [user_jids];
    }
    attrs = {
      to: room_jid,
      id: Math.random() * 10000000 | 0
    };
    if (id !== null) {
      attrs['id'] = id;
    }
    node = $msg(attrs).c('x', {
      xmlns: 'http://jabber.org/protocol/muc#user'
    });
    user_jids.forEach((jid) => {
      node.c('invite', {
        to: jid
      });
      node.c('reason');
      node.t(reason);
      node.up();
      return node.up();
    });
    return ConnectionManager.send(node.tree());
  }

  /**
   * @deprecated
   */
  removeUsersFromRoom(room_jid, user_jids, cb = _.noop) {
    var stanza;
    if (isNil(user_jids)) {
      user_jids = [];
    }
    if (!Array.isArray(user_jids)) {
      user_jids = [user_jids];
    }
    Logger.info(`Removing users from room - room_jid: ${room_jid}, user_jids: ${user_jids}`);
    stanza = $iq({
      type: 'set',
      to: room_jid
    }).c('query', {
      xmlns: 'http://hipchat.com'
    });
    user_jids.forEach((jid) => {
      stanza.c('item', {
        jid: jid,
        affiliation: "none"
      });
      return stanza.up();
    });
    return this.sendIQ(stanza, cb);
  }

  /**
   * @deprecated
   */
  fetchHistory(jid, before, maxstanzas, id, cb) {
    var opts, stanza;
    if (isNil(maxstanzas)) {
      maxstanzas = 50;
    }
    if (ConfigStore.isGuest()) {
      return false;
    }
    Logger.info(`Getting history - jid: ${jid}`);
    opts = {
      xmlns: 'http://hipchat.com/protocol/history',
      maxstanzas: maxstanzas,
      type: this.getJidType(jid)
    };
    if (!isNil(before)) {
      opts.before = this.toXMPPDate(before);
    }
    stanza = $iq({
      type: 'get',
      to: jid,
      id: id
    }).c('query', opts);
    return this.sendIQ(stanza, cb);
  }

  /**
   * @deprecated
   */
  fetchUserProfile(jid, cb = _.noop) {
    var stanza;
    if (!jid) {
      return;
    }
    if (this.cached_profiles[jid] && cb) {
      cb(this.cached_profiles[jid]);
      return;
    }
    Logger.info(`Fetching profile - jid: ${jid}`);
    stanza = $iq({
      type: 'get',
      to: jid
    }).c('query', {
      xmlns: 'http://hipchat.com/protocol/profile'
    });
    return this.sendIQ(stanza, (data) => {
      if (!data.error) {
        this.cached_profiles[jid] = data;
      }
      if (cb) {
        return cb(data);
      }
    });
  }

  /**
   * @deprecated
   */
  joinChat(jid, cb = noop) {
    return this.sendStateMessage(jid, 'chat', 'active');
  }

  /**
   * @deprecated
   */
  sendMessage(msg) {
    var attrs, node;
    attrs = {
      to: msg.jid,
      type: this.getJidType(msg.jid),
      id: Math.random() * 10000000 | 0
    };
    if (msg.id !== null) {
      attrs['id'] = msg.id;
    }
    node = $msg(attrs).c('body').t(msg.text).up();
    if (attrs.type === 'chat') {
      attrs.from = ConfigStore.get('jid');
      node.c('active', {
        xmlns: 'http://jabber.org/protocol/chatstates'
      }).up().c('x', {
        xmlns: 'http://hipchat.com'
      }).c('echo').up().up();
    }
    if (msg.xhtml) {
      node.c('html').c('body').c('p').h(msg.xhtml);
    }
    return ConnectionManager.send(node.tree());
  }

  /**
   * Sends a message stanza with a replace node
   * @deprecated
   */
  editMessage(jid, text, original_mid, ts, id) {
    var attrs, node;
    if (isNil(id)) {
      id = null;
    }
    attrs = {
      to: jid,
      type: this.getJidType(jid),
      from: ConfigStore.get('jid'),
      id: Math.random() * 10000000 | 0
    };
    if (id !== null) {
      attrs['id'] = id;
    }
    node = $msg(attrs).c('body').t(text).up();
    node.c('replace', {
      xmlns: 'urn:xmpp:message-correct:0',
      id: original_mid,
      ts: ts
    }).up().c('x', {
      xmlns: 'http://hipchat.com'
    }).c('echo');
    return ConnectionManager.send(node.tree());
  }

  /**
   * Deletes a message
   * @deprecated
   */
  deleteMessage(msg) {
    // current implementation of deleting a message is to send an edit message with an empty message body
    // shortcutting to reusing sendEditMessage for now to minimize code duplication
    return this.editMessage(msg.from, "", msg.mid, msg.ts);
  }

  /**
   * @deprecated
   */
  sendStateMessage(jid, type, state) {
    var attrs, node;
    attrs = {
      to: jid,
      type: type,
      id: Math.random() * 10000000 | 0
    };
    node = $msg(attrs).c(state, {
      xmlns: 'http://jabber.org/protocol/chatstates'
    }).up();
    return ConnectionManager.send(node.tree());
  }

  /**
   * @deprecated
   */
  savePreferences(changeset = {}, cb = _.noop) {
    var token = ConfigStore.get('apiv1_token');
    if (!token || ConfigStore.get('is_guest') || !ConnectionManager.isConnected()) {
      return;
    }
    if (_.has(changeset, 'autoJoin')) {
      if (!Array.isArray(changeset.autoJoin)) {
        delete changeset.autoJoin;
      } else {
        changeset.autoJoin = _.reduce(changeset.autoJoin, (acc, room) => {
            if (_.isPlainObject(room) && !_.isEmpty(room)) {
              acc.push(room);
            }

            return acc;
         }, []);
      }
    }
    if (!_.isEmpty(changeset)) {
      var jsonResp;
      return $.ajax({
        type: 'POST',
        dataType: 'json',
        url: `${ ConfigStore.get('base_url') }/api/save_preferences`,
        data: {
          json: JSON.stringify(_.omitBy(changeset, _.isNull)),
          user_id: ConfigStore.get('user_id'),
          group_id: ConfigStore.get('group_id'),
          token: token,
          format: 'json'
        },
        async: true,
        complete: (resp) => {
          try {
            jsonResp = JSON.parse(resp.responseText);
            if (jsonResp.error && jsonResp.error === 'Invalid token') {
              ConnectionManager.updateApiV1Token()
                .then(() => {
                  this.savePrefsAttempts++;
                  if (this.savePrefsAttempts <= 5) {
                    this.savePrefsRetryDelay = utils.decorrelatedJitter(Constants.RECONNECT_MAX_DELAY, Constants.RECONNECT_DELAY_MS, this.savePrefsRetryDelay, Constants.RECONNECT_BACKOFF_FACTOR);
                    _.delay(this.savePreferences.bind(this), this.savePrefsRetryDelay);
                  }
                });
            } else {
              this.savePrefsAttempts = 0;
              cb();
            }
          } catch (e) {
            Logger.warn('[API V1 response structure:] ' + resp.responseText);
            cb(resp.responseText);
          }
        }
      });
    }
  }

  /**
   * Looks to be completely unused
   * @deprecated
   */
  sendUploadMessage(data) {
    var attrs, file_info, msg;
    if (!ConnectionManager.isConnected()) {
      return false;
    }
    file_info = x2js.xml2json(data.file_info);
    attrs = {
      to: data.jid,
      type: data.type
    };
    msg = $msg(attrs).c('x', {
      xmlns: 'http://hipchat.com/protocol/muc#room'
    }).c('file', {
      'id': file_info.response.file_id
    }).up().up();
    if (data.type !== 'groupchat') {
      msg.c('x', {
        xmlns: 'http://hipchat.com'
      }).c('echo').up().up();
    }
    return ConnectionManager.send(msg.tree());
  }

  /**
   * @deprecated
   */
  clearWebCookies(cb = _.noop) {
    var url = utils.url.clearWebCookies(ConfigStore.get('web_server'));
    if (url) {
      utils.request.simplePost(url, cb);
    }
  }

  /**
   * @deprecated
   */
  revokeOauth2Token(cb = _.noop) {
    var token = ConfigStore.getOAuthToken(),
        url = utils.url.revokeOauth2Token(ConfigStore.get('api_host'), token);
    $.ajax({
      type: 'DELETE',
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      },
      url: url,
      async: true,
      success: function (resp) {
        cb(resp);
      },
      error: function (resp) {
        cb(resp);
      }
    });
  }

  /**
   * @deprecated
   */
  requestAddliveCredentials(jid, cb = _.noop) {
    var done, fail, stanza;
    stanza = $iq({
      to: jid,
      type: 'get'
    }).c('query', {
      xmlns: 'http://hipchat.com/protocol/addlive'
    });
    done = function(resp) {
      resp = x2js.xml2json(resp);
      return cb(null, resp.query);
    };
    fail = function(resp) {
      resp = x2js.xml2json(resp);
      return cb(resp.error);
    };
    return ConnectionManager.sendIQ(stanza, done, fail);
  }

  /**
   * @deprecated
   */
  sendVideoMessage(...args) {
    let attrs,
      data = args[0],
      type = data.type,
      node,
      id = Math.random() * 10000000 | 0;
    if (isNil(data.type)) {
      type = 'call';
    }
    if (!ConnectionManager.isConnected()) {
      return false;
    }
    attrs = {
      to: data.jid,
      type: this.getJidType(data.jid),
      from: ConfigStore.get('user_jid'),
      id: id
    };
    node = $msg(attrs).c('x', {
      xmlns: `http://hipchat.com/protocol/${data.service}`
    }).c(type);
    if (data.service === 'enso') {
      if (type === 'call') {
        node.c('url').t(data.url);
        node.up().up().up().c('body')
          .t(VideoCallStrings.enso_to_addlive( data.url.replace('/join/', '/call/') ));
      } else if (type === 'decline') {
        node.c('reason').t(data.reason);
      }
    } else {
      node.c('audio').up();
      if (!data.audio_only) {
        node.c('video');
      }
    }
    this.once('videoMessage', {id: id}, data.callback);
    return ConnectionManager.send(node.tree());
  }
}

export default new HipChat();



/** WEBPACK FOOTER **
 ** ./src/js/core/hipchat.js
 **/