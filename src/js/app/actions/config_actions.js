import AppDispatcher from 'dispatchers/app_dispatcher';

export default {

  /**
   * Notifies native client that API V1 auth token has been updated.
   * Native client updates the cookie.
   */
  updateAuthTokens(config) {
    AppDispatcher.dispatch('auth-token-update', config);
  },

  updateFeatureFlags(config) {
    AppDispatcher.dispatch('feature-flags-update', config);
  },

  updateAppConfiguration(config) {
    AppDispatcher.dispatch('configuration-change', config);
  },

  serverUnsupportedError(reason) {
    AppDispatcher.dispatch('server-unsupported', reason);
  },

  updateSID(config) {
    AppDispatcher.dispatch('update-sid', config);
  },

  cacheConfigured() {
    AppDispatcher.dispatch('DAL:cache-configured');
  }

};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/config_actions.js
 **/