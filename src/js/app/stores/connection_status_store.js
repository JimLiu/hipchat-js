import AppDispatcher from 'dispatchers/app_dispatcher';
import Store from 'lib/core/store';
import Timer from 'core/common/timer';
import ConnectionStates from 'lib/enum/connection';
import NetworkStates from 'lib/enum/network';

class ConnectionStatusStore extends Store {

  constructor() {
    super();
    this._countdownTimer = new Timer(() => this._countdownTimerFn(), 1000, 1000, true);
    this._offlineBannerTimer = new Timer(() => this._offlineBannerTimerFn(), 5000);
  }

  registerListeners() {
    AppDispatcher.register({
      'network-up': () => {
        this._offlineBannerTimer.clear();
        this.set({'network_status': NetworkStates.ONLINE});
      },
      'network-down': () => {
        this._offlineBannerTimer.start();
      },
      'strophe-connected': () => {
        this._setConnectionState(ConnectionStates.CONNECTED);
      },
      'strophe-reconnected': () => {
        this._setConnectionState(ConnectionStates.CONNECTED);
      },
      'strophe-reconnecting': (data) => {
        this._setConnectionState(ConnectionStates.RECONNECTING, data);
      },
      'strophe-reconnect-delay': (data) => {
        this._setConnectionState(ConnectionStates.RECONNECT_DELAY, data);
        this._countdownTimer.clear().start();
      },
      'strophe-connection-failed': () => {
        this._setConnectionState(ConnectionStates.DISCONNECTED);
      },
      'unload-app': () => {
        this._setConnectionState(ConnectionStates.UNLOADING);
      },
      'exit-app': () => {
        this._setConnectionState(ConnectionStates.UNLOADING);
      }
    });
  }

  getDefaults() {
    return {
      connection_status: ConnectionStates.CONNECTED,
      network_status: NetworkStates.ONLINE,
      reconnectingIn: 0,
      reconnectionAttempts: 0
    };
  }

  _setConnectionState(status, data) {
    this.set({
      connection_status: status,
      reconnectionAttempts: _.get(data, 'reconnectAttempts') || this.data.reconnectionAttempts,
      reconnectingIn: _.get(data, 'reconnectDelay') || this.data.reconnectingIn
    });
  }

  _countdownTimerFn() {
    let current = this.data.reconnectingIn,
        next = current > 1000 ? current - 1000 : 0;
    this.set('reconnectingIn', next);
    if (next === 0) {
      this._countdownTimer.clear();
    }
  }

  _offlineBannerTimerFn() {
    this.set({'network_status': NetworkStates.OFFLINE});
  }
}

export default new ConnectionStatusStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/connection_status_store.js
 **/