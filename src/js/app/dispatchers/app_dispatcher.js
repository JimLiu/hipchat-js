import Dispatcher from 'lib/core/dispatcher';

class AppDispatcher extends Dispatcher {

  dispatch(action, ...args) {
    let Logger = require('helpers/logger');
    Logger.type('app-dispatcher:' + action).log(...args);
    super.dispatch(action, ...args);
  }
}

export default new AppDispatcher();


/** WEBPACK FOOTER **
 ** ./src/js/app/dispatchers/app_dispatcher.js
 **/