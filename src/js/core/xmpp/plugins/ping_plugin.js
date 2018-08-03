import AbstractPlugin from './abstract_plugin';
import Timer from 'core/common/timer';
import Logger from 'helpers/logger';
import * as Constants from 'core/common/constants';
import ConfigStore from 'stores/configuration_store';

const PING_RESPONSE_TIMEOUT = Constants.XMPP_INACTIVITY_INTERVAL + Constants.XMPP_PONG_WAIT + Constants.NETWORK_LATENCY_GRACE_PERIOD;
const GRACEFUL_INACTIVITY_PERIOD = Constants.XMPP_INACTIVITY_INTERVAL + Constants.NETWORK_LATENCY_GRACE_PERIOD;

/**
 * Strophe Connection Plugin for handling pings
 *
 * @class PingPlugin
 * @property {Timer} xmppPingTimer
 * @property {Strophe.Connection} Connection
 */
export default class PingPlugin extends AbstractPlugin {

  /**
   * @override
   */
  init(...args) {
    super.init(...args);

    Strophe.addNamespace('PING', 'urn:xmpp:ping');

    this.pingTimer = new Timer(this.ping.bind(this), GRACEFUL_INACTIVITY_PERIOD);
  }

  /**
   * If the server returns an XMPP body that is not empty, restart
   * the timer. If the timer runs out, and there hasn't been an XMPP
   * response that contains childNodes, send a ping to keep the BOSH
   * session alive
   *
   * @override
   */
  onConnected() {
    this.Connection.ConnectionHooks.addXmlInputHandler((xmpp) => {
      if (xmpp.hasChildNodes()) {
        this.pingTimer.restart();
      }
      return true;
    });
  }

  /**
   * If we lose connection, clear the ping timer
   *
   * @override
   */
  onDisconnected() {
    this.pingTimer.clear();
  }

  /**
   * @private
   * @method _doPing
   */
  ping() {
    let type = 'get',
      to = ConfigStore.get('chat_server'),
      stanza = $iq({type, to}).c('ping', {xmlns: Strophe.NS.PING}).tree();

    this.Connection.sendIQ(stanza, null, this._onPingError.bind(this), PING_RESPONSE_TIMEOUT);
    Logger.debug('[PING]', 'Sending ping to keep XMPP session alive');
  }

  /**
   * If this IQ times out, the stanza passed in from Strophe will be null
   * @private
   */
  _onPingError(stanza) {
    if (!stanza) {
      Logger.debug('[PING]', 'Ping request timed out. Disconnecting Strophe');
      this.Connection.disconnect();
    }
  }

}





/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/ping_plugin.js
 **/