import AbstractPlugin from './abstract_plugin';
import * as NS from '../lib/namespaces';
import DALError from 'core/models/dal-error';
import ConfigStore from 'stores/configuration_store';
import PreferencesStore from 'stores/preferences_store';
import Presence from 'lib/enum/presence';

export default class PresencePlugin extends AbstractPlugin {

  constructor(...args) {
    super(...args);
    this.idleTimestamp = null;
  }

  init(...args) {
    super.init(...args);
    Strophe.addNamespace('HC_PRESENCE', NS.HC_PRESENCE);
    Strophe.addNamespace('ENTITY_CAPABILITIES', NS.ENTITY_CAPABILITIES);
    Strophe.addNamespace('LAST_ACTIVITY', NS.LAST_ACTIVITY);
  }

  /**
   * Sends the initial presence to tell the server the client has
   * connected or reconnected. Send on connection events. Same as
   * regular presence, but includes the ENTITY_CAPABILITIES info:
   *
   * <presence roster_presences="false" xmlns="jabber:client">
   *  <show>chat</show>
   *  <c xmlns="http://jabber.org/protocol/caps"
   *     node="http://hipchat.com/client/web"
   *     ver="4.15.0"
   *     os_ver="Chrome 49"/>
   * </presence>
   *
   * @param {string} [show = 'chat']
   * @returns {Promise<undefined,DALError>}
   */
  sendInitialPresence(show = Presence.AVAILABLE) {
    return this.setPresence(show, null, true);
  }

  /**
   * Sends global presences to the server to broadcast your status.
   * Subscribes to echoes of these presences since the server will
   * send the right back to you as long as you're subscribed to your
   * own presence updates -- which you should always be
   *
   * Just presence (show):
   *
   * <presence roster_presences="false" xmlns="jabber:client">
   *   <show>dnd</show>
   * </presence>
   *
   * Presence and status text:
   *
   * <presence roster_presences="false" xmlns="jabber:client">
   *   <show>chat</show>
   *   <status>I'm back</status>
   * </presence>
   *
   * Idle (show === 'away'):
   *
   * <presence roster_presences="false" xmlns="jabber:client">
   *   <show>away</show>
   *   <status>I'm away</status>
   *   <query xmlns="jabber:iq:last" seconds="900"/>
   * </presence>
   *
   * @param {string} [show = 'chat']
   * @param {string|null} [status = null]
   * @param {boolean} [send_caps = false]
   * @returns {Promise<undefined,DALError>}
   */
  setPresence(show = Presence.AVAILABLE, status = null, send_caps = false) {
    return new Promise((resolve, reject) => {
      let success, error;

      success = this.Connection.addHandler(() => {
        this.Connection.deleteHandler(error);
        resolve();
        return false;
      }, null, 'presence', null, null, ConfigStore.get('jid'), { matchBare: true });

      error = this.Connection.addHandler((xmpp) => {
        this.Connection.deleteHandler(success);
        reject(DALError.fromXMPP(xmpp));
        return false;
      }, null, 'presence', 'error', null, ConfigStore.get('jid'), { matchBare: true });

      this.Connection.send(this._createPresenceStanza(show, status, send_caps));
    });
  }

  /**
   * Sets global presence filter to the provided list of user ids.
   * Must include the current user's id; it will be appended if absent.
   * We should *always* be subscribed to receive our own presences.
   *
   * Sends:
   *
   * <iq type="set" xmlns="jabber:client">
   *  <query xmlns="http://hipchat.com/protocol/presence" action="presence_filter">
   *    <uid>1</uid>
   *    <uid>2</uid>
   *    <uid>3</uid>
   *    ...
   *  </query>
   * </iq>
   *
   * Receives:
   *
   * <iq xmlns='jabber:client' type='result' from='jid' id='18:sendIQ' to='my-jid'/>
   *
   * @param {Array<string|number>} idList = [[]]
   * @returns {Promise<undefined,DALError>}
   */
  filterPresences(idList = []) {
    let currentUserId = ConfigStore.get('user_id').toString(),
      stanza = $iq({ type: 'set' })
        .c('query', {
          xmlns: Strophe.NS.HC_PRESENCE,
          action: 'presence_filter'
        });

    if (!_.find(idList, (item) => item.toString() === currentUserId)) {
      idList.push(currentUserId);
    }

    idList.forEach((uid) => {
      stanza.c('uid', uid).up();
    });

    return new Promise((resolve, reject) => {
      this.Connection.sendIQ(
        stanza.tree(),
        (iq) => resolve(),
        (err) => reject(DALError.fromXMPP(err))
      );
    });
  }

  /**
   * @method _createPresenceStanza
   * @param {string} [show = 'chat']
   * @param {string|null} [status = null]
   * @param {boolean} [send_caps = false]
   * @returns {*} Strophe presence stanza object
   * @private
   */
  _createPresenceStanza(show = Presence.AVAILABLE, status = null, send_caps = false) {
    let stanza = $pres({ roster_presences: 'false' })
      .c('show').t(show).up();

    if (status) {
      stanza.c('status').t(status).up();
    }

    if (show === Presence.IDLE) {
      stanza.c('query', {
        xmlns: Strophe.NS.LAST_ACTIVITY,
        seconds: this._getIdleSeconds()
      }).up();
      this._updateIdleTimestamp();
    } else {
      this._resetIdleTimestamp();
    }

    if (send_caps) {
      stanza.c('c', {
        xmlns: Strophe.NS.ENTITY_CAPABILITIES,
        node: ConfigStore.get('client_node'),
        ver: ConfigStore.get('client_version_id'),
        os_ver: ConfigStore.get('client_os_version_id')
      }).up();
    }

    return stanza.tree();
  }

  /**
   * Get the current idle preference in milliseconds
   * @returns {number}
   * @private
   */
  _getIdlePreferenceMS() {
    return PreferencesStore.get('idleMinutes') * 60 * 1000;
  }

  /**
   * Get the number of seconds the user has been idle.
   * @returns {number}
   * @private
   */
  _getIdleSeconds() {
    if (this.idleTimestamp) {
      return Math.round((new Date().getTime() - this.idleTimestamp + this._getIdlePreferenceMS()) / 1000);
    }
    return this._getIdlePreferenceMS() / 1000;
  }

  /**
   * Update idleTimestamp value any time you set presence to 'away'
   * @private
   */
  _updateIdleTimestamp() {
    this.idleTimestamp = this.idleTimestamp ? this.idleTimestamp : new Date().getTime();
  }

  /**
   * Clear idleTimestamp any time you set presence to something
   * other than 'away'
   * @private
   */
  _resetIdleTimestamp() {
    this.idleTimestamp = null;
  }
}



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/presence_plugin.js
 **/