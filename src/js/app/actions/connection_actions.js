import AppDispatcher from 'dispatchers/app_dispatcher';

/**
 * ConnectionActions
 */
export default {

  stropheConnected() {
    AppDispatcher.dispatch('strophe-connected');
  },

  stropheReconnected() {
    AppDispatcher.dispatch('strophe-reconnected');
  },

  stropheReconnecting(params) {
    AppDispatcher.dispatch('strophe-reconnecting', params);
  },

  stropheReconnectDelay(params) {
    AppDispatcher.dispatch('strophe-reconnect-delay', params);
  },

  stropheAuthenticating() {
    AppDispatcher.dispatch('strophe-authenticating');
  },

  stropheDisconnected() {
    AppDispatcher.dispatch('strophe-disconnected');
  },

  stropheDisconnecting() {
    AppDispatcher.dispatch('strophe-disconnecting');
  },

  stropheAuthFailed(status, condition) {
    AppDispatcher.dispatch('strophe-auth-failed', status, condition);
  },

  stropheConnectionFailed(status, condition) {
    AppDispatcher.dispatch('strophe-connection-failed', status, condition);
  },

  strophePolicyViolation(status, condition){
    AppDispatcher.dispatch('strophe-policy-violation', status, condition);
  },

  reconnect() {
    AppDispatcher.dispatch('attempt-reconnect');
  },

  reconnectionError(error) {
    AppDispatcher.dispatch('reconnection-error', error);
  },

  disconnect(should_reconnect = false) {
    AppDispatcher.dispatch('attempt-disconnect', should_reconnect);
  },

  handleReconnectLinkClick() {
    AppDispatcher.dispatch('attempt-reconnect-without-reset');
  },

  appStateConnected() {
    AppDispatcher.dispatch('app-state-connected');
  },

  appStateReconnected() {
    AppDispatcher.dispatch('app-state-reconnected');
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/connection_actions.js
 **/