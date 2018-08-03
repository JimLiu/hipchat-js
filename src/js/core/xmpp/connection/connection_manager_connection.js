import './connection_manager_request';
import ConfigStore from 'stores/configuration_store';
import ConfigActions from 'actions/config_actions';
import ConfigurationModel from 'models/configuration_model';
import utils from 'helpers/utils';
import AnalyticsActions from 'actions/analytics_actions';
import ClientType from 'lib/enum/client_type';

/**
 * Have to create a temporary faux-class here to fix the prototype chain
 * that is broken due to the way Strophe is written (sadpanda)
 */
var StropheConnectionClassFix = function () {
  Strophe.Connection.apply(this, arguments);
};

StropheConnectionClassFix.prototype = _.extend(StropheConnectionClassFix.prototype, Strophe.Connection.prototype);

/**
 * Extends Strophe.Connection to apply overrides for
 * HipChat authentication.
 *
 * @class HCStropheConnection
 */
export default class Connection extends StropheConnectionClassFix {

  /**
   * @constructs
   */
  constructor() {
    super(ConfigStore.get('bind_url'));

    /**
     * @property {boolean} supportsRestarts
     */
    this.supportsRestarts = false;
  }

  /**
   * @override
   * @method connect
   */
  connect(...args) {
    let onAuthSuccessCallback = (elem) => {
      let jid = elem.textContent,
        access_token = elem.getAttribute('oauth2_token') || ConfigStore.getOAuthToken();
      AnalyticsActions.successfulAuthEvent(jid, access_token);
      ConfigActions.updateAuthTokens(new ConfigurationModel({ access_token }));
      return this._sasl_success_cb(elem);
    };
    let onAuthFailedCallback = (elem) => {
      if (this._sasl_success_handler) {
        this.deleteHandler(this._sasl_success_handler);
        this._sasl_success_handler = null;
      }
      if (this._sasl_challenge_handler) {
        this.deleteHandler(this._sasl_challenge_handler);
        this._sasl_challenge_handler = null;
      }

      if (this._sasl_mechanism) {
        this._sasl_mechanism.onFailure();
      }

      let conditionElement = elem.firstElementChild;
      let condition = (conditionElement && conditionElement.nodeName) || null;
      this._changeConnectStatus(Strophe.Status.AUTHFAIL, condition);
      return false;
    };

    // Need to reapply these callbacks each time connect is called to handle auth
    this._sasl_success_handler = this._addSysHandler(onAuthSuccessCallback, null, 'success', null, null);
    this._sasl_failure_handler = this._addSysHandler(onAuthFailedCallback, null, 'failure', null, null);
    this._sasl_challenge_handler = this._addSysHandler(this._sasl_challenge_cb.bind(this), null, "challenge", null, null);

    super.connect(...args);
  }

  /**
   * @override
   * @method authenticate
   */
  authenticate() {
    if (!this.supportsRestarts && this._needsRestartFeature()) {
      ConfigActions.serverUnsupportedError('stream-restart-unsupported');
      return;
    }
    return this.send(this._buildRequestAuthExchangeTree());
  }

  /**
   * @override
   * @method _sasl_auth1_cb
   */
  _sasl_auth1_cb() {
    this.authenticated = true;
    return this._changeConnectStatus(Strophe.Status.CONNECTED, null);
  }

  /**
   * @override
   * @method _connect_cb
   */
  _connect_cb(req, callback, raw) {
    var body = this._proto._reqToData(req);
    if (!body) {
      return;
    }

    let updateRestartSupport = (elem) => {
      this.supportsRestarts = this.supportsRestarts || (elem.getElementsByTagNameNS("http://hipchat.com", "authrestartlogic").length > 0);
    };

    let inactivity = body.getAttribute('inactivity');
    let wait = body.getAttribute('wait');
    this.allowedInactivityInterval = parseInt(inactivity ? inactivity : wait, 10) * 1000;

    updateRestartSupport(body);
    this._addSysHandler(updateRestartSupport, null, 'stream:features', null, null);
    return super._connect_cb(req, callback, raw);
  }

  /**
   * @method needsRestartFeature
   * @returns {boolean}
   */
  _needsRestartFeature() {
    return ConfigStore.isOAuth();
  }

  /**
   * Builds the correctly formatted auth exchange stanza
   *
   * @private
   * @method _buildRequestAuthExchangeTree
   * @returns {stanza}
   */
  _buildRequestAuthExchangeTree() {
    let clientType,
        clientSubType,
        clientIdentifier,
        exchange;

    clientType = ConfigStore.get('client_type');

    if (clientType === ClientType.WEB) {
      clientSubType = utils.browser.family();
    } else {
      clientSubType = ConfigStore.get('client_subtype');
    }

    clientIdentifier = `${clientType}_${clientSubType}`;

    switch (ConfigStore.get('auth_method')) {
      case 'nonce':
        exchange = $build('auth', {
          xmlns: Strophe.NS.SASL,
          mechanism: 'X-HIPCHAT-WEB',
          nonce: ConfigStore.getNonceToken(),
          oauth2_token: 'true',
          node: ConfigStore.get('client_node'),
          ver: ConfigStore.get('client_version_id')
        });
        exchange.t(ConfigStore.get('jid').split('@')[0]);
        break;

      case 'oauth2':
        exchange = $build('auth', {
          xmlns: 'http://hipchat.com',
          mechanism: 'oauth2',
          oauth2_token: 'false',
          restart_stream: 'true',
          node: ConfigStore.get('client_node'),
          ver: ConfigStore.get('client_version_id')
        });
        exchange.t(Base64.encode(`\u0000${ConfigStore.getOAuthToken()}\u0000${clientIdentifier}`));
        break;
    }
    return exchange.tree();
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/connection/connection_manager_connection.js
 **/