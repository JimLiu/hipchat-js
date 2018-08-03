import AppDispatcher from 'dispatchers/app_dispatcher';

/**
 * SearchActions
 */
export default {

  updateAPIV1Token() {
    AppDispatcher.dispatch('apiv1-token-update-requested');
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/search_actions.js
 **/