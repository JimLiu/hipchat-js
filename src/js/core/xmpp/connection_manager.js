import * as Constants from 'core/common/constants';
import Timer from 'core/common/timer';
import DAL from 'core/dal';
import utils from 'helpers/utils';
import Logger from 'helpers/logger';
import HC_Strophe_Connection from './connection/connection_manager_connection';
import x2js from 'core/common/x2js';
import ConfigStore from 'stores/configuration_store';
import ConfigActions from 'actions/config_actions';
import ConfigurationModel from 'models/configuration_model';
import ConnectionActions from 'actions/connection_actions';
import PingPlugin from './plugins/ping_plugin';
import ConnectionHooksPlugin from './plugins/connection_hooks_plugin';
import RoomsPlugin from './plugins/rooms_plugin';
import ChatPlugin from './plugins/chat_plugin';
import PresencePlugin from './plugins/presence_plugin';
import XMPPTrapPlugin from './plugins/xmpp_trap_plugin';
import RosterPlugin from './plugins/roster_plugin';
import EmoticonsPlugin from './plugins/emoticons_plugin';
import CachePlugin from './plugins/cache_plugin';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import DALCache from 'core/dal.cache';

const STATE = Symbol.for('HJC.Connection.Manager.State');
const PREFIX = '[Connection]';

/**
 * @class ConnectionManager
 * @singleton
 */
class ConnectionManager {

  constructor() {

    /**
     * Internal STATE
     */
    this[STATE] = {
      isInitialConnect: true,
      connected: false,
      shouldReconnect: true, //should only ever be set to false when exiting the app
      isRefreshOAuthTokenInFlight: false,
      isSessionRequestInFlight: false,
      reconnectDelay: Constants.RECONNECT_DELAY_MS,
      oauthTokenRefreshDelay: Constants.OAUTH_TOKEN_REFRESH_DELAY_MS,
      reconnectAttempts: 0,
      disconnectedTimestamp: null
    };

    this.refreshOAuthToken = () => { Promise.resolve(); };

    /**
     * Can't instantiate this until after we get the bind_url
     * @property Connection
     * @type {Strophe.Connection}
     */
    this.Connection = null;

    /**
     * Started once the CM sends a 'connect' stanza to the server when
     * trying to reconnect. If the app connects before it runs out, it
     * will clear itself. If not, it will re-call the 'reconnect' method
     * to try again
     *
     * @property {Timer} reconnectionTimer
     */
    this.reconnectionTimer = new Timer(() => {
      if (this[STATE].shouldReconnect || this.isBOSHSessionExpired()) {
        this.reconnect(false);
      }
    }, this[STATE].reconnectDelay);

    /**
     * For OAuth, starts once connection is established and executes
     * an hour later when the oauth token has expired to get a new token
     *
     * @property {Timer} oauthRefreshTimer
     */
    this.oauthRefreshTimer = new Timer(() => {
      Logger.debug(PREFIX, 'OAuth timer expired. Fetching new OAuth token');
      AnalyticsDispatcher.dispatch('analytics-event', {
        name: 'hipchat.client.oauth.token.refresh.requested',
        properties: {
          reason: 'Token expiry timer lapsed'
        }
      });
      this._getNewOAuthToken().then(_.noop).catch((err) => {
        Logger.error(PREFIX, `Failed to fetch new OAuth token due to: ${err}`);
      });
    }, 3599000, 5000);
    this.oauthRetryTimer = null;

    /**
     * The apiV1TokenRefreshTimer is started on initial connect.
     * Refreshes the token each time it fires, then starts over again
     */
    this.apiV1TokenRefreshTimer = new Timer(() => {
      this.updateApiV1Token().catch(() => {});
    }, ConfigStore.getApiV1TokenExpiry(), 5000);
  }

  //TODO: temp stopgap to get this holdover callback from native initState in here
  setOAuthTokenCallback(callback) {
    if (_.isFunction(callback)){
      this.refreshOAuthToken = callback;
    }
    return this;
  }

  /**
   * Begins connection. Nothing happens until this method is called
   *
   * @method connect
   */
  connect() {
    return this._initializeSession()
      .then(() => {

        /**
         * Install Strophe Connection plugins. You only need to do this once, and before
         * the Strophe.Connection is instantiated. Installing them here as the client
         * configuration will be guaranteed by this point from the _initializeSession method.
         * NOTE: ConnectionHooks must be installed first as it provides hooks
         * other plugins are using
         */
        Strophe.addConnectionPlugin('ConnectionHooks', new ConnectionHooksPlugin());
        Strophe.addConnectionPlugin('XMPPTrapPlugin', new XMPPTrapPlugin());
        Strophe.addConnectionPlugin('Presence', new PresencePlugin());
        Strophe.addConnectionPlugin('Ping', new PingPlugin());
        Strophe.addConnectionPlugin('Rooms', new RoomsPlugin());
        Strophe.addConnectionPlugin('Chat', new ChatPlugin());
        Strophe.addConnectionPlugin('Roster', new RosterPlugin());
        Strophe.addConnectionPlugin('Emoticons', new EmoticonsPlugin());
        Strophe.addConnectionPlugin('Cache', new CachePlugin());

        this.Connection = new HC_Strophe_Connection();
        return this._doConnect();
      })
      .then(() => {
        this._registerEventListeners();
      })
      .catch((error) => {
        Logger.error('[ConnectionManager.connect]: ', error);
      });
  }

  /**
   * Does the initial connection handshake requests to the server. If
   * the ajax and auth handshake is successful, will resolve. If the
   * requests time out, auth fail or connection fail, will reject
   * @returns {Promise}
   * @private
   */
  _doConnect() {
    return new Promise((resolve, reject) => {
      this.Connection.ConnectionHooks.addXmppConnectedHandler(() => {
        Logger.debug(PREFIX, 'Strophe successfully connected');
        this._resetForNewReconnection();
        this[STATE].connected = true;

        resolve();
        return false;
      });

      this.Connection.ConnectionHooks.addXmppDisconnectedHandler((status, condition) => {
        Logger.error(PREFIX, `Strophe failed to connect. Status: ${status}, Condition: ${condition}`);
        reject({ status, condition });
        return false;
      });

      this.Connection.connect(ConfigStore.get('jid'), null, this._onConnectionChange.bind(this), null, null, ConfigStore.get('route'));
    });
  }

  /**
   * Initiate reconnection request through Strophe
   *
   * @method reconnect
   */
  reconnect(resetAndReconnect = true) {
    if (this[STATE].connected || this[STATE].isSessionRequestInFlight) {
      return Promise.resolve();
    }

    if (resetAndReconnect) {
      this._resetForNewReconnection();
      this[STATE].connected = false;
      clearTimeout(this.oauthRetryTimer);
    }

    return this._doReconnect();
  }

  /**
   * @method _doReconnect
   */
  _doReconnect() {
    Logger.debug(PREFIX, 'Strophe reconnecting');

    this.reconnectionTimer.clear();
    this[STATE].reconnectAttempts++;
    if (this[STATE].reconnectAttempts < 6) {
      this._signalReconnecting();
    }

    return this._reestablishSession()
      .then(() => {
        this.Connection.disconnect('Resetting before reconnect');
        this.Connection.reset();
        return this._doConnect();
      })
      .catch((data) => {
        Logger.error(PREFIX, `Error reestablishing connection. Server response: ${JSON.stringify(data)}`);
        // Your session cookie has expired. You need to login again
        if (data && data.refresh_page) {
          ConnectionActions.reconnectionError(`${PREFIX} Error reestablishing connection. Server response: ${JSON.stringify(data)}`);
        }

        this._setReconnectTimer();

        if (this[STATE].reconnectAttempts < 5) {
          this._signalReconnectDelay();
          Logger.debug(PREFIX, `reconnect(). Next attempt in ${this[STATE].reconnectDelay / 1000}s`);
        } else {
          this._signalConnectionFailed(`Error: 5 failure attempts to reestablish connection. Server response (if any): ${JSON.stringify(data)}`);
        }
      });
  }

  /**
   * Disconnect from xmpp, put in not-connected STATE
   * and kill any timers going on
   *
   * @method disconnect
   * @param {boolean} should_reconnect
   */
  disconnect(should_reconnect = true) {
    Logger.debug(PREFIX, 'disconnect() called.');
    if (!should_reconnect) {
      Logger.debug(PREFIX, 'disconnect() called. Should not auto-reconnect.');
      this[STATE].shouldReconnect = false;
      this.reconnectionTimer.clear();
    }
    this[STATE].connected = false;
    this.Connection.disconnect();
    this.Connection.flush();
  }

  /**
   * Pass through to Strophe.Connection.send
   * @method send
   */
  send(...args) {
    if (!this.Connection) {
      Logger.error(PREFIX, 'Attempted to send stanza before establishing an initial XMPP connection:', arguments[0].outerHTML);
      return;
    }
    this.Connection.send(...args);
  }

  /**
   * Pass through to Strophe.Connection.sendIQ
   */
  sendIQ(...args) {
    if (!this.Connection) {
      Logger.error(PREFIX, 'Attempted to sendIQ before establishing an initial XMPP connection:', arguments[0].outerHTML);
      return;
    }
    this.Connection.sendIQ(...args);
  }

  /**
   * Pass through to Strophe.Connection.addHandler
   * @returns {Strophe.Handler}
   */
  addHandler(...args) {
    if (this.Connection) {
      return this.Connection.addHandler(...args);
    }
  }

  /**
   * Pass through to Strophe.Connection.addTimedHandler
   * @returns {Strophe.Handler}
   */
  addTimedHandler(...args) {
    if (this.Connection) {
      return this.Connection.addTimedHandler(...args);
    }
  }

  /**
   * Pass through to Strophe.Connection.deleteHandler
   * @method deleteHandler
   */
  deleteHandler(...args) {
    if (this.Connection) {
      this.Connection.deleteHandler(...args);
    }
  }

  /**
   * Returns the time (in milliseconds) the last disconnection occurrred
   * @return {Date} The time the last disconnect occurred
   */
  getDisconnectedTimestamp() {
    return this[STATE].disconnectedTimestamp;
  }

  /**
   * @method isConnected
   * @returns {boolean} is it currently connected
   */
  isConnected() {
    return this[STATE].connected;
  }

  /**
   * @method isInitialConnect
   * @returns {boolean}
   */
  isInitialConnect() {
    return this[STATE].isInitialConnect;
  }

  /**
   * @method isBOSHSessionExpired
   */

  isBOSHSessionExpired() {
    return (utils.now() - this.Connection.last_BOSH_activity) > this.Connection.allowedInactivityInterval + Constants.NETWORK_LATENCY_GRACE_PERIOD;
  }

  /**
   * @method updateApiV1Token - Send the IQ to update the API V1 token
   * @return {promise}
   */
  updateApiV1Token() {
    return new Promise((resolve) => {
      let stanza = $iq({
        type: 'get',
        to: ConfigStore.get('chat_server')
      }).c('query', {
        xmlns: 'http://hipchat.com/protocol/auth'
      });
      this.Connection.sendIQ(stanza, (response) => {
        let parsedResponse = x2js.xml2json(response);
        if (parsedResponse.query.token) {
          ConfigActions.updateAuthTokens(new ConfigurationModel({
            token: x2js.xml2json(response).query.token
          }));
          this.apiV1TokenRefreshTimer.clear()
            .resetTime(ConfigStore.getApiV1TokenExpiry())
            .start();
        }
        resolve();
      });
    });
  }

  /**
   * @function _initializeSession
   * @private
   * @returns {Promise}
   */
  _initializeSession() {
    return new Promise((resolve, reject) => {
      // If in oauth mode, we should've been provided the config we need so resolve with what we have
      // If there's a base_url defined, then we're connecting to a server that requires a nonce token
      // (ie. connecting to atlassian.hipchat.com from a devvm). This only happens when you gulp build
      // with an explicit HC_WEB_BASEURL defined. In that case, we need to get that session token
      // and then resolve with the response we get. Otherwise, just proceed and connect. In production,
      // no base_url is defined, and the session token is passed from web in the initial STATE
      if (!ConfigStore.get('base_url') || ConfigStore.isOAuth()) {
        DALCache.configure(ConfigStore.get('user_id'), ConfigStore.get('group_id'));
        return resolve();
      }

      let request = $.ajax({
        url: `${ConfigStore.get('base_url')}/chat/session?nonce_auth=1`,
        type: 'GET',
        headers: {
          'accepts': 'application/json'
        }
      });

      request
        .done((response) => {
          if (response.error) {
            reject(response.error);
          } else {
            ConfigActions.updateAppConfiguration(new ConfigurationModel(response));
            DALCache.configure(ConfigStore.get('user_id'), ConfigStore.get('group_id'));
            resolve();
          }
        })
        .fail((jqXHR) => {
          this._handleErrorResponse(jqXHR, reject);
        });
    });
  }

  /**
   * For Nonce, post ajax req to /chat/session to reestablish session
   * For OAuth, if the token is old, get a new one
   *
   * @function _reestablishSession
   * @private
   */
  _reestablishSession() {
    return new Promise((resolve, reject) => {
      if (ConfigStore.isNonce()) {
        this[STATE].isSessionRequestInFlight = true;

        let request = $.ajax({
          url: `${ConfigStore.get('base_url')}/chat/session`,
          type: 'GET',
          timeout: 10000,
          data: {
            is_guest: ConfigStore.isGuest(),
            guest_key: ConfigStore.get('guest_key'),
            uid: ConfigStore.get('user_id'),
            nonce_auth: 1
          }
        });

        request
          .done((response) => {
            if (response.error) {
              reject(response);
            } else {
              ConfigActions.updateAppConfiguration(new ConfigurationModel(response));
              resolve();
            }
          })
          .fail((jqXHR) => {
            this._handleErrorResponse(jqXHR, reject);
          })
          .always(() => {
            this[STATE].isSessionRequestInFlight = false;
          });

      } else if (ConfigStore.isOAuth()) {
        if (this.oauthRefreshTimer.hasExpired()) {
          AnalyticsDispatcher.dispatch('analytics-event', {
            name: 'hipchat.client.oauth.token.refresh.requested',
            properties: {
              reason: '_reestablishSession() called'
            }
          });
          this._getNewOAuthToken().then(resolve).catch(reject);
        } else {
          DAL.checkNetwork().then(resolve).catch(reject);
        }
      }
    });
  }

  /**
   * Does the jQuery-specific responseText checking on the xhr for errors
   *
   * @param xhr the jqXHR object
   * @param callback the function you intend to use as your error handler
   * @private
   */
  _handleErrorResponse(xhr, callback) {
    var response = xhr.responseText;
    if (_.isString(response) && response !== "") {
      try {
        response = JSON.parse(response);
      } catch (e) {
        response = {
          error: e
        };
      }
    }
    callback(response, xhr);
  }

  /**
   * Request the startup stanza from xmpp, and resolve
   * once it comes back
   *
   * @method _getStartupStanza
   * @private
   * @returns {Promise}
   */
  _getStartupStanza() {
    return new Promise((resolve) => {
      let stanza = $iq({
        type: 'get',
        id: Math.random() * 10000000 | 0
      }).c('query', {
        xmlns: 'http://hipchat.com/protocol/startup',
        send_auto_join_user_presences: false
      });
      this.Connection.sendIQ(stanza, (d) => {
        resolve();
      });
    });
  }

  /**
   * Fetch feature flags from [server]/api/features
   *
   * @method _getFeatureFlags
   * @private
   * @returns {Object}
   */
  _getFeatureFlags() {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: 'POST',
        url: utils.url.featureFlagsAPI(ConfigStore.get('base_url')),
        dataType: 'json',
        data: {
          user_id: ConfigStore.get('user_id'),
          group_id: ConfigStore.get('group_id')
        }
      })
      .done((data) => {
        let featureFlags = _.pickBy(data.features, (val, key) =>
          key.indexOf('web_client') === 0 || key === 'btf' || key === 'entity_versioning' // conditions copied from chat.php
        );
        // Pass native_feature_flags along with feature_flags so Configuration Model
        // correctly reconciles the flags
        let flags = new ConfigurationModel({
          'feature_flags': featureFlags,
          'native_feature_flags': ConfigStore.get("native_feature_flags")
        });
        ConfigActions.updateFeatureFlags(flags);
        resolve(flags);
      })
      .fail((jqXHR, textStatus) => {
        Logger.error("[_getFeatureFlags]", jqXHR.statusText);
        reject(jqXHR.statusText);
      });
    });
  }

  /**
   * @method _setReconnectTimer
   */
  _setReconnectTimer() {
    let decorrelatedJitterMS = utils.decorrelatedJitter(Constants.RECONNECT_MAX_DELAY, Constants.RECONNECT_DELAY_MS, this[STATE].reconnectDelay, Constants.RECONNECT_BACKOFF_FACTOR);
    this[STATE].reconnectDelay = Math.round(decorrelatedJitterMS / 1000) * 1000;
    Logger.debug(PREFIX, 'Attempting reconnect in ' + this[STATE].reconnectDelay);
    this.reconnectionTimer.resetTime(this[STATE].reconnectDelay).start();
  }

  /**
  * Reset variables used for reconnection attempts.
  * This should only be used after 5 failed reconnection attempts.
  *
  * @method _resetForNewReconnection
  */
  _resetForNewReconnection() {
    this[STATE].shouldReconnect = true;
    this[STATE].reconnectDelay = Constants.RECONNECT_DELAY_MS;
    this[STATE].reconnectAttempts = 0;
  }

  /**
   * Callback fired whenever Strophe signals a connection change
   * Exported to make mocking easier. Not to be used outside of testing
   *
   * @method _onConnectionChange
   * @private
   * @param status
   * @param condition
   */
  _onConnectionChange(status, condition) {
    switch (status) {

      /**
       * Reset flags to connected status
       * Kill reconnect timer
       * Emit connect + initial-connect/reconnect events
       */
      case Strophe.Status.CONNECTED:
        this._updateSID();

        Logger.debug(PREFIX, 'Strophe connected');

        let promises = [];

        if (ConfigStore.isOAuth()) {
          promises.push(this._getStartupStanza()
            .then(() => {
              Logger.debug(PREFIX, 'Startup stanza received');
              ConfigActions.updateAuthTokens({
                apiv1_token: ConfigStore.getApiV1Token()
              });
              this.apiV1TokenRefreshTimer
                .resetTime(ConfigStore.getApiV1TokenExpiry())
                .restart();
            })
            .catch((err) => {
              Logger.error(PREFIX, 'Error getting startup stanza', err);
            }));
          if (this[STATE].isInitialConnect) {
            this.oauthRefreshTimer.resetTime(ConfigStore.getOAuthTokenExpiry()).start();
          } else {
            this.oauthRefreshTimer.resume();
          }
        } else if (ConfigStore.isNonce() && !ConfigStore.isGuest()) {
          this.apiV1TokenRefreshTimer
            .resetTime(ConfigStore.getApiV1TokenExpiry())
            .restart();
        }

        if (this[STATE].isInitialConnect) {
          ConnectionActions.stropheConnected();
        } else {
          ConnectionActions.stropheReconnected();
        }

        promises.push(this._getFeatureFlags()
          .then(() => {
            Logger.debug(PREFIX, 'Feature flags received');
          })
          .catch((err) => {
            Logger.error(PREFIX, 'Error getting feature flags', err);
          }));

        return Promise.all(promises)
          .then(() => {
            if (this[STATE].isInitialConnect) {
              ConnectionActions.appStateConnected();
              this[STATE].isInitialConnect = false;
            } else {
              ConnectionActions.appStateReconnected();
            }
          })
          .catch((err) => {
            Logger.error(PREFIX, 'Unknown connection error', err);
          });

      /**
       * Reset flags to disconnected status
       * If condition is 'conflict', disable reconnect
       * Emit connection fail
       */
      case Strophe.Status.CONNFAIL:
      case Strophe.Status.AUTHFAIL:

        Logger.debug(PREFIX, `[Strophe] Offline. Condition: ${condition}`);
        this[STATE].connected = false;
        if (condition === 'conflict' || condition === 'not-allowed' || condition === 'not-authorized') {
          ConnectionActions.stropheAuthFailed(status, condition);
          this.reconnectionTimer.clear();
        } else if (condition === 'policy-violation'){
          ConnectionActions.strophePolicyViolation(status, condition);
          this.reconnectionTimer.clear();
        } else {
          this._signalConnectionFailed(condition);
        }
        break;

      /**
       * Reset flags to disconnected status
       * Start reconnection timer
       */
      case Strophe.Status.DISCONNECTED:

        Logger.debug(PREFIX, '[Strophe] Disconnected');
        this[STATE].disconnectedTimestamp = new Date().getTime();
        this[STATE].connected = false;
        this.oauthRefreshTimer.pause();
        this.apiV1TokenRefreshTimer.clear();
        ConnectionActions.stropheDisconnected();
        if (this[STATE].shouldReconnect) {
          Logger.debug(PREFIX, '[Strophe] Disconnected and attempting Reconnect');
          this.reconnect(false);
        }
        break;

      /**
       * Just log. No further action needed
       */
      case Strophe.Status.AUTHENTICATING:
        Logger.debug(PREFIX, '[Strophe] Authenticating');
        ConnectionActions.stropheAuthenticating();
        break;

      case Strophe.Status.CONNECTING:
        Logger.debug(PREFIX, '[Strophe] Connecting');
        break;

      case Strophe.Status.DISCONNECTING:
        Logger.debug(PREFIX, '[Strophe] Disconnecting. Condition: ' + condition);
        ConnectionActions.stropheDisconnecting({ status, condition });
        break;
    }
  }

  /**
   * @function _getNewOAuthToken
   * @private
   */
  _getNewOAuthToken() {
    // This is currently a pretty janky scenario as the function to actually get a new oauth token is passed in the initState from native
    // TODO: make this a spi
    if (this[STATE].isRefreshOAuthTokenInFlight) {
      Logger.error('Oauth: OAuth token refresh already in progress');
    }

    return new Promise((resolve, reject) => {
      this._tryToGetOAuthToken()

        // Success will resolve to: { "access_token": "t0k3n", "expires_in": 0000 }
        // expires_in is number of seconds (not milliseconds)
        .then((data) => {
          Logger.debug(PREFIX, `Successfully received new OAuth token. Expires in: ${data.expires_in} seconds.`);
          this[STATE].isRefreshOAuthTokenInFlight = false;
          this.oauthRefreshTimer.resetTime(ConfigStore.getOAuthTokenExpiry()).start();
          try {
            ConfigActions.updateAuthTokens(new ConfigurationModel(data));
          } catch (e) {
            Logger.error(PREFIX, `Downstream error captured when dispatching new oauth token to the rest of the app: ${ e.message }`);
          }
          resolve();
        })

        // Rejection will resolve to: { "error": "some error", "error_code": 000, "error_description": "long error string" }
        // error_code of 302 (or 401) should trigger sign-out as the oauth refresh token on the native side has been revoked
        .catch((data) => {
          Logger.error(PREFIX, `Failed to retrieve OAuth token: ${data.error_description}`);
          ConnectionActions.stropheAuthFailed({
            status: Strophe.Status.AUTHFAIL,
            condition: data.error_description
          });
          reject();
        });
    });
  }

  _tryToGetOAuthToken() {
    return new Promise((resolve, reject) => {
      let attempts = 1,
        delay = Constants.OAUTH_TOKEN_REFRESH_DELAY_MS,
        tryAgain;

      let onError = (data) => {
        this[STATE].isRefreshOAuthTokenInFlight = false;
        Logger.debug(PREFIX, `Attempt #${ attempts } to refresh oauth token failed with ${ data.error_code }, ${ data.error_description }. Retrying again in ${delay}`);
        if (data.error_code === 302 || data.error_code === 401 || (data.error_code === 400 && data.error === 'invalid_grant')) {
          reject(data);
          return;
        }

        attempts++;
        delay = utils.decorrelatedJitter(Constants.OAUTH_TOKEN_REFRESH_MAX_DELAY, Constants.OAUTH_TOKEN_REFRESH_DELAY_MS, delay, Constants.OAUTH_TOKEN_REFRESH_BACKOFF_FACTOR);
        this.oauthRetryTimer = setTimeout(tryAgain, delay);
      };

      tryAgain = () => {
        Logger.debug(PREFIX, `Trying to refresh oauth token. Attempt #${attempts}`);
        this[STATE].isRefreshOAuthTokenInFlight = true;
        this.refreshOAuthToken().then(resolve).catch(onError);
      };

      tryAgain();
    });
  }

  /**
   * @private
   */
  _registerEventListeners() {
    $(window).on('beforeunload', this._unloadListener.bind(this));
  }

  /**
   * Event listener registered on window when the page is being unloaded
   * @private
   */
  _unloadListener() {
    if (this[STATE].connected) {
      this.disconnect(false);
    }
  }

  _updateSID() {
    let sid = _.clone(this.Connection._proto.sid);
    ConfigActions.updateSID(new ConfigurationModel({
      sid: sid
    }));
  }

  _signalReconnecting() {
    ConnectionActions.stropheReconnecting({
      reconnectAttempts: this[STATE].reconnectAttempts
    });
  }

  _signalReconnectDelay() {
    ConnectionActions.stropheReconnectDelay({
      reconnectDelay: this[STATE].reconnectDelay
    });
  }

  _signalConnectionFailed(data) {
    ConnectionActions.stropheConnectionFailed(Strophe.Status.CONNFAIL, data);
  }

  /**
   * Reset configuration variables to empty STATE
   * FOR TESTING ONLY
   * @method reset
   */
  reset() {
    this.Connection = null;
    this.oauthRefreshTimer.clear();
    this.reconnectionTimer.clear();
    this.apiV1TokenRefreshTimer.clear();
    this[STATE].connected = false;
    this[STATE].isInitialConnect = true;
    this[STATE].shouldReconnect = true;
    this[STATE].reconnectDelay = Constants.RECONNECT_DELAY_MS;
    this[STATE].reconnectAttempts = 0;
    this[STATE].isRefreshOAuthTokenInFlight = false;
    this[STATE].isSessionRequestInFlight = false;
    $(window).off('beforeunload', this._unloadListener.bind(this));
  }
}

export default new ConnectionManager();



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/connection_manager.js
 **/