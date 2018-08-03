import AppDispatcher from 'dispatchers/app_dispatcher';
import NetworkStatusHelper from 'helpers/network_status_helper';

/**
 * NetworkStatusActions
 */
export default {

  onNetworkDown() {
    NetworkStatusHelper.onNetworkDown();
  },

  onNetworkUp() {
    NetworkStatusHelper.onNetworkUp();
  },

  networkDown() {
    AppDispatcher.dispatch('network-down');
  },

  networkUp() {
    AppDispatcher.dispatch('network-up');
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/network_status_actions.js
 **/