import ConfigStore from 'stores/configuration_store';
import AppConfig from 'config/app_config';
import AbstractPlugin from './abstract_plugin';
import DALError from 'core/models/dal-error';
import Room from 'core/models/room';
import XMPPUtils from '../lib/xmpp-utils';
import * as NS from '../lib/namespaces';

/**
 * Strophe Connection plugin that contains logic around
 * creating, modifying, deleting rooms
 */
export default class RoomsPlugin extends AbstractPlugin {

  init(...args) {
    super.init(...args);
    Strophe.addNamespace('HC', NS.HC);
    Strophe.addNamespace('HC_MUC_ROOM', NS.HC_MUC_ROOM);
    Strophe.addNamespace('HC_MUC_PERMISSIONS', NS.HC_MUC_PERMISSIONS);
    Strophe.addNamespace('MUC_USER', NS.MUC_USER);
    Strophe.addNamespace('MUC_OWNER', NS.MUC_OWNER);
  }

  /**
   * Create a new room by sending an "available" presence with
   * the new room details to a non-existent room jid.
   * http://xmpp.org/extensions/xep-0045.html#createroom
   * https://extranet.atlassian.com/pages/viewpage.action?pageId=2334034757#HipChatClients:HowDoTheyWork?-JoiningroomJoiningaroom
   *
   * @method create
   * @param {string} name
   * @param {string} topic
   * @param {string} privacy
   * @returns {Promise<CreateRoomResponse, DALError>}
   */
  create(name, topic, privacy) {
    let jid = XMPPUtils.createRoomJid(name);
    return new Promise((resolve, reject) => {

      /**
       * Creating a room via XMPP triggers an iq "set" stanza to be
       * returned with the room id, name, topic, privacy and version:
       *
       * <iq xmlns="jabber:client" to="${my_jid}" type="set">
       *  <query xmlns="http://hipchat.com/protocol/muc#room">
       *    <item jid="${room_jid}" name="${name}">
       *      <id>2115114</id>
       *      <name>${name}</name>
       *      <topic>${topic}</topic>
       *      <privacy>${privacy}</privacy>
       *      <owner>${owner_jid}</owner>
       *      <guest_url />
       *      <version>${version_hash}</version>
       *      <num_participants>0</num_participants>
       *    </item>
       *  </query>
       * </iq>
       *
       * We'll listen for that iq, and resolve with the room id
       * so the return value of this api is the same as the rest version
       *
       * @typedef {object} CreateRoomResponse
       * @property {number} id
       */
      let successHandler = this.Connection.addHandler((xmpp) => {
        let item = xmpp.querySelector(`item[jid="${ jid }"]`);
        if (item && item.getAttribute('name') === name) {
          let id = parseInt(item.querySelector('id').textContent, 10);
          resolve({ id });
          return false;
        }
        return true;
      }, Strophe.NS.HC_MUC_ROOM, 'iq', 'set');

      this.checkIfOnline().then(() => {
        this.join(jid, 0, { name, topic, privacy }).catch((error) => {
          this.Connection.deleteHandler(successHandler);
          reject(error);
        });
      }, (connectionError) => {
        this.Connection.deleteHandler(successHandler);
        reject(connectionError);
      });
    });
  }

  /**
   * Join a room by sending an "available" presence to the room jid.
   * http://xmpp.org/extensions/xep-0045.html#enter
   * https://extranet.atlassian.com/pages/viewpage.action?pageId=2334034757#HipChatClients:HowDoTheyWork?-JoiningroomJoiningaroom
   *
   * TODO: If a maxstanzas value is provided, this method triggers multiple side-effects
   * TODO: in that it returns a join success AND history messages. It may make sense to
   * TODO: either break this into multiple methods or make the return value an observable.
   * TODO: For now, just returning the join success and letting the global trap take care of history
   *
   * @method join
   * @param {string} jid
   * @param {number} [maxstanzas=0]
   * @param {object} [newRoomOpts=null] options if room being joined is a new room.
   *  - Should be an object containing: { name, topic, privacy }
   * @returns {Promise<JoinRoomResponse, DALError>}
   */
  join(jid, maxstanzas = 0, newRoomOpts = null, limitPresences = true) {
    let id = `joinRoom:${ _.uniqueId() }`,
      room = `${ jid }/${ ConfigStore.get('user_name') }`,
      type = 'available',
      stanza = $pres({ type, to: room, id })
        .c('x', { xmlns: Strophe.NS.MUC })
        .c('history', { maxstanzas }).up().up();

    if (newRoomOpts) {
      stanza.c('x', { xmlns: Strophe.NS.HC_MUC_ROOM })
        .c('name').t(newRoomOpts.name).up()
        .c('topic').t(newRoomOpts.topic).up()
        .c('privacy').t(newRoomOpts.privacy).up().up();
    }

    if (!ConfigStore.get('is_guest', false) && limitPresences) {
      //HC Servers that do not recognize this element will simply ignore it and function as always
      //sending all room participant presences automatically after room join.
      stanza.c('limit', {
          maxmemberpresences: AppConfig.initial_room_participants_limit,
          xmlns: Strophe.NS.HC
        });
    }

    return new Promise((resolve, reject) => {
      let successHandler, errorHandler;

      successHandler = this.Connection.addHandler((xmpp) => {
        let mucUser = xmpp.getElementsByTagNameNS(Strophe.NS.MUC_USER, 'x')[0];
        if (mucUser.querySelector('status[code="110"]')) {
          this.Connection.deleteHandler(errorHandler);
          resolve(this._processJoinRoomPresence(xmpp));
          return false;
        }
        return true;
      }, Strophe.NS.MUC_USER, 'presence', null, null, room);

      errorHandler = this.Connection.addHandler((xmpp) => {
        this.Connection.deleteHandler(successHandler);
        reject(DALError.fromXMPP(xmpp));
        return false;
      }, null, 'presence', 'error', id, null);

      this.Connection.send(stanza.tree());
    });
  }

  /**
   * Leave a room. Sends an unavailable presence to the room. The room returns
   * a corresponding unavailable presence back to you with status code of 110:
   *
   * <presence xmlns='jabber:client' from='room_jid/User Name' type='unavailable' to='my_full_jid'>
   *  <x xmlns='http://jabber.org/protocol/muc#user'>
   *    <item affiliation='member' jid='my_bar_jid' role='none'/>
   *    <status code='110'/>
   *  </x>
   *  <status>reason for leaving (unused)</status>
   * </presence>
   *
   * @method leave
   * @param {string} jid
   * @returns {Promise<undefined,DALError>}
   */
  leave(jid) {
    let room = jid + '/' + ConfigStore.get('user_name'),
      stanza = $pres({ to: room, type: 'unavailable' });

    return new Promise((resolve, reject) => {

      this.Connection.addHandler((xmpp) => {
        let mucUser = xmpp.getElementsByTagNameNS(Strophe.NS.MUC_USER, 'x')[0];

        if (xmpp.getAttribute('type') === 'error') {
          reject(DALError.fromXMPP(xmpp));
          return false;

        } else if (mucUser.querySelector('status[code="110"]')) {
          resolve();
          return false;
        }
        return true;
      }, null, 'presence', ['unavailable', 'error'], null, room);

      this.Connection.send(stanza.tree());
    });
  }

  /**
   * Fetch details for a specific room
   * http://xmpp.org/extensions/xep-0045.html#disco-roominfo
   *
   * @method fetch
   * @param {string} jid
   * @returns {Promise<Room, DALError>}
   */
  fetch(jid) {
    let stanza = $iq({ type: 'get', to: jid })
      .c('query', { xmlns: Strophe.NS.DISCO_INFO });

    return new Promise((resolve, reject) => {
      this.Connection.sendIQ(stanza.tree(),
        (xmpp) => resolve(Room.fromXMPPDiscoInfo(xmpp)),
        (xmpp) => reject(DALError.fromXMPP(xmpp)));
    });
  }

  /**
   * Rename a room. Sends rename IQ to server. Success response is an empty result IQ:
   * <iq xmlns='jabber:client' type='result' from='room_jid' id='XXX' to='my_full_jid'/>
   *
   * @method rename
   * @param {string} jid
   * @param {string} name
   * @returns {Promise<undefined,DALError>}
   */
  rename(jid, name) {
    let stanza = $iq({ type: 'set', to: jid })
      .c('query', { xmlns: Strophe.NS.HC })
      .c('rename').t(name);

    return this.sendIQWithOfflineGuard(stanza);
  }

  /**
   * Downloads the entire rooms list from XMPP. Last resort if sync'ing fails; This is
   * slow and expensive for large groups.
   *
   * @method getAll
   * @returns {Promise<Array<Room>, DALError>}
   */
  getAll() {
    let stanza = $iq({ type: 'get', to: ConfigStore.get('conference_server') })
      .c('query', { xmlns: Strophe.NS.DISCO_ITEMS, ignore_archived: true });

    return new Promise((resolve, reject) => {
      let success = (xmpp) => {
        let query = xmpp.getElementsByTagNameNS(Strophe.NS.DISCO_ITEMS, 'query')[0],
          items = Array.from(query.querySelectorAll('item')),
          rooms = items.map((item) => Room.fromXMPPDiscoItem(item));
        resolve(rooms);
      };

      let error = (xmpp) => reject(DALError.fromXMPP(xmpp));

      this.Connection.sendIQ(stanza.tree(), success, error);
    });
  }

  /**
   * Change a room's privacy setting. Success response is an empty result IQ:
   * <iq xmlns='jabber:client' type='result' from='room_jid' id='XXX' to='my_full_jid'/>
   *
   * @method setPrivacy
   * @param {string} jid
   * @param {string} privacy - "public" or "private"
   * @returns {Promise<undefined,DALError>}
   */
  setPrivacy(jid, privacy) {
    let stanza = $iq({ type: 'set', to: jid })
      .c('query', { xmlns: Strophe.NS.HC })
      .c('privacy').t(privacy);

    return this.sendIQWithOfflineGuard(stanza);
  }

  /**
   * Set room topic
   *
   * @method setTopic
   * @param {string} jid
   * @param {string} [topic='']
   * @returns {Promise<undefined,DALError>}
   */
  setTopic(jid, topic = '') {
    topic = topic.trim().substr(0, AppConfig.max_topic_text_length);
    let stanza = $msg({ to: jid, type: 'groupchat' }).c('subject').t(topic);

    return new Promise((resolve, reject) => {
      let success, error, timeout;

      success = this.Connection.addHandler((message) => {
        let subjectNode = message.querySelector('subject'),
          subject = subjectNode ? subjectNode.textContent.trim() : '';
        if (subject === topic) {
          this.Connection.deleteHandler(error);
          this.Connection.deleteTimedHandler(timeout);
          resolve();
          return false;
        }
        return true;
      }, null, 'message', 'groupchat', null, jid, { matchBare: true });

      error = this.Connection.addHandler((message) => {
        this.Connection.deleteHandler(success);
        this.Connection.deleteTimedHandler(timeout);
        reject(DALError.fromXMPP(message));
      }, null, 'message', 'error', null, jid, { matchBare: true });

      timeout = this.Connection.addTimedHandler(AppConfig.default_message_confirmation_timeout, () => {
        this.Connection.deleteHandler(success);
        this.Connection.deleteHandler(error);
        reject(DALError.ofType(DALError.Types.TIMEOUT));
      });

      this.Connection.send(stanza.tree());
    });
  }

  /**
   * Set guest access on a room. Success response is an empty result IQ:
   * <iq xmlns='jabber:client' type='result' from='room_jid' id='XXX' to='my_full_jid'/>
   *
   * @method setGuestAccess
   * @param {string} jid
   * @param {boolean} enabled
   * @returns {Promise<undefined,DALError>}
   */
  setGuestAccess(jid, enabled) {
    let stanza = $iq({ type: 'set', to: jid })
      .c('query', { xmlns: Strophe.NS.HC })
      .c('guest_access').t(enabled ? 1 : 0);

    return this.sendIQWithOfflineGuard(stanza);
  }

  /**
   * @method inviteUsers
   * @param {string} roomJid
   * @param {array} userJids
   * @returns {Promise}
   */
  inviteUsers(roomJid, userJids) {}

  /**
   * @method removeUsers
   * @param {string} roomJid
   * @param {array} userJids
   * @returns {Promise}
   */
  removeUsers(roomJid, userJids) {}

  /**
   * Delete a room.
   * Sends an IQ to tell the server to delete the room. The server will respond with
   * an empty IQ result that matches your sent IQ id and room
   *
   * <iq xmlns='jabber:client' type='result' from='the-room-you-deleted@conf.btf.hipchat.com'
   *   id='10:sendIQ' to='1_2@chat.btf.hipchat.com'/>
   *
   * @method delete
   * @param {string} jid
   * @returns {Promise}
   */
  delete(jid) {
    let stanza = $iq({ type: 'set', to: jid })
      .c('query', { xmlns: Strophe.NS.MUC_OWNER })
      .c('destroy');

    return this.sendIQWithOfflineGuard(stanza);
  }

  /**
   * Process a join room presence response stanza:
   *
   *  <presence xmlns="jabber:client" to="1_4@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222" from="1_adfasdfasdfas@conf.devvm.hipchat.com/Homer Simpson">
   *    <x xmlns="http://jabber.org/protocol/muc#user">
   *      <item affiliation="owner" jid="1_4@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222" role="participant" />
   *      <status code="110" />
   *    </x>
   *    <x xmlns="http://hipchat.com/protocol/muc#room">
   *      <name>adfasdfasdfas</name>
   *      <privacy>public</privacy>
   *      <topic />
   *      <rostersize>1</rostersize>
   *    </x>
   *    <x xmlns="http://hipchat.com/protocol/muc#permissions">
   *      <permission>room:invite_user</permission>
   *      <permission>room:create</permission>
   *      <permission>update_own_user</permission>
   *    </x>
   *  </presence>
   *
   * @param xmpp
   * @returns {JoinRoomResponse}
   * @private
   */
  _processJoinRoomPresence(xmpp) {
    let permsNode = xmpp.getElementsByTagNameNS(Strophe.NS.HC_MUC_PERMISSIONS, 'x')[0],
      item = xmpp.getElementsByTagNameNS(Strophe.NS.MUC_USER, 'x')[0].querySelector('item'),
      mucRoomNode = item = xmpp.getElementsByTagNameNS(Strophe.NS.HC_MUC_ROOM, 'x')[0],
      topicNode = mucRoomNode ? mucRoomNode.querySelector('topic') : null,
      topic = topicNode ? topicNode.textContent : '',
      permissions = permsNode ? _.map(permsNode.querySelectorAll('permission'), (ele) => ele.textContent) : [],
      rosterSize = (xmpp.querySelector('rostersize')) ? parseInt(xmpp.querySelector('rostersize').textContent, 10) : 0;

    /**
     * @typedef {object} JoinRoomResponse
     * @property {string} jid
     * @property {string} type - "groupchat"
     * @property {string} [role]
     * @property {string} [affiliation]
     * @property {Array<string>} permissions - list of permissions the current user has on this room
     */
    return {
      jid: Strophe.getBareJidFromJid(xmpp.getAttribute('from')),
      type: 'groupchat',
      role: item ? item.getAttribute('role') : null,
      affiliation: item ? item.getAttribute('affiliation') : null,
      permissions: permissions,
      roster_size: rosterSize,
      topic: topic
    };
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/rooms_plugin.js
 **/