import AppDispatcher from 'dispatchers/app_dispatcher';

export default {

  receivedServerData (data) {
    AppDispatcher.dispatch('server-data', data);
  }

};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/bosh_actions.js
 **/