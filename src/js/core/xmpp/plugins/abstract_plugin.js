import NetworkStatusHelper from 'helpers/network_status_helper';
import DALError from 'core/models/dal-error';
import { XMPP_SEND_IQ_TIMEOUT } from 'core/common/constants';

/**
 * @class AbstractPlugin
 * @property {Strophe.Connection} Connection
 */
export default class AbstractPlugin {

  constructor() {
    this.Connection = null;
  }

  /**
   * @method init
   * @param {Strophe.Connection} connection
   */
  init(connection) {
    this.Connection = connection;
    this.connected = false;
  }

  /**
   * @method onStatusChanged
   * @param {Strophe.Status} status
   * @param {string} [reason]
   */
  statusChanged(status, reason) {
    switch (status) {
      case Strophe.Status.CONNECTED:
        this.connected = true;
        this.onConnected();
        break;

      case Strophe.Status.AUTHENTICATING:
        this.onAuthenticating();
        break;

      case Strophe.Status.CONNECTING:
        this.onConnecting();
        break;

      case Strophe.Status.DISCONNECTING:
        this.onDisconnecting();
        break;

      case Strophe.Status.AUTHFAIL:
        this.onAuthFailure();
        break;

      case Strophe.Status.CONNFAIL:
        this.onConnectionFailure();
        break;

      case Strophe.Status.DISCONNECTED:
        this.connected = false;
        this.onDisconnected(reason);
        break;
    }
  }

  /**
   * @method onConnected
   */
  onConnected() {}

  /**
   * @method onAuthenticating
   */
  onAuthenticating() {}

  /**
   * @method onConnecting
   */
  onConnecting() {}

  /**
   * @method onDisconnecting
   */
  onDisconnecting() {}

  /**
   * @method onDisconnected
   * @param {string} [reason]
   */
  onDisconnected(reason) {}

  /**
   * @method onAuthFailure
   */
  onAuthFailure() {}

  /**
   * @method onConnectionFailure
   */
  onConnectionFailure() {}

  isConnected() {
    return this.connected;
  }

  /**
   * Wrapper for Connection.sendIQ.
   *
   * @method sendIQWithOfflineGuard
   * @param {object} stanza
   * @param {function} onSuccess
   * @param {function} onError
   *
   * @returns {Promise<success, error>}
   */
  sendIQWithOfflineGuard(stanza, onSuccess = _.noop, onError = _.noop) {

    return new Promise((resolve, reject) => {
      if (!NetworkStatusHelper.isOnline() || !this.isConnected()) {
        return reject(DALError.ofType(DALError.Types.OFFLINE));
      }

      let success = (xmpp) => {
        onSuccess(xmpp);
        resolve();
      };
      let error = (xmppErr) => {
        onError(xmppErr);
        if (!xmppErr) {
          //On xmpp reqest timeout, the stanza will be null.
          return reject(DALError.ofType(DALError.Types.TIMEOUT));
        }
        return reject(DALError.fromXMPP(xmppErr));
      };

      this.Connection.sendIQ(stanza.tree(), success, error, XMPP_SEND_IQ_TIMEOUT);
    });
  }

  /**
   * test is it online returns resolved or rejected Promise.
   *
   * @method checkIfOnline
   *
   * @returns {Promise}
   */
  checkIfOnline() {

    return new Promise((resolve, reject) => {
      if (!NetworkStatusHelper.isOnline() || !this.isConnected()) {
        reject(DALError.ofType(DALError.Types.OFFLINE));
      } else {
        resolve();
      }
    });
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/abstract_plugin.js
 **/