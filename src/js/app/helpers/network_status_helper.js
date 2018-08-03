import Logger from 'helpers/logger';
import ConfigStore from 'stores/configuration_store';
import NetworkStatusActions from 'actions/network_status_actions';
import REST from 'core/rest/rest';

class NetworkStatusHelper {

  constructor() {
    this._state = false;
    this._shouldCheckNetwork = true;
    this._currentConfirmNetworkUpPromise = null;
  }

  initialize({ doHealthCheck = true } = {}) {
    this._state = true;
    this._shouldCheckNetwork = !!doHealthCheck;

    if (ConfigStore.get('client_type') === 'web') {
      $(window).on('online', this.onNetworkUp.bind(this));
      $(window).on('offline', this.onNetworkDown.bind(this));
    }
  }

  /**
   * called by the external API or the browser when online status detected
   */
  onNetworkUp() {
    this._currentConfirmNetworkUpPromise = null;

    if (this._state === true) {
      return;
    }

    Logger.debug('[NetworkStatusHelper]', 'network up event received, signaling UI');
    this._state = true;
    NetworkStatusActions.networkUp();
  }

  /**
   * called by the external API or the browser when offline status detected
   */
  onNetworkDown() {
    this._currentConfirmNetworkUpPromise = null;

    if (this._state === false) {
      return Promise.resolve();
    }

    Logger.debug('[NetworkStatusHelper]', 'network down event received, performing health check to confirm');

    if (!this._shouldCheckNetwork) {
      Logger.debug('[NetworkStatusHelper]', 'health check disabled, signaling offline to UI');
      this._state = false;
      NetworkStatusActions.networkDown();
      return;
    }

    var confirmNetworkUpPromise = this._confirmNetworkUp().then(() => {
      Logger.error('[NetworkStatusHelper]', 'network down event received, health check indicates we are still online, leaving UI as is');
    }).catch(() => {
      Logger.debug('[NetworkStatusHelper]', 'network down event received, health check confirmed');
      if (this._currentConfirmNetworkUpPromise === confirmNetworkUpPromise) {
        Logger.debug('[NetworkStatusHelper]', 'health check still current, signaling offline to UI');
        this._state = false;
        NetworkStatusActions.networkDown();
      } else {
        Logger.debug('[NetworkStatusHelper]', 'health check was cancelled, no UI changes');
      }
    });

    this._currentConfirmNetworkUpPromise = confirmNetworkUpPromise;
    return confirmNetworkUpPromise;
  }

  _confirmNetworkUp() {
    return REST.checkNetwork();
  }

  /**
   * Check our network connectivity
   *
   * @method isOnline
   * @returns {boolean}
   */
  isOnline() {
    return this._state;
  }

}

export default new NetworkStatusHelper();



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/network_status_helper.js
 **/