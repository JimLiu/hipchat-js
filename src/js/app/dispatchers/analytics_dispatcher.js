import Dispatcher from 'lib/core/dispatcher';
import Logger from 'helpers/logger';

class AnalyticsDispatcher extends Dispatcher {

  dispatch(action, ...args) {
    // most of these are fine to log in verbose mode, but logging every single keystroke is a bit much
    // Test if Logger.log is defined before trying to log (because of circular dependencies)
    if (Logger.log) {
      if (action !== 'analytics-set-message-value') {
        Logger.debug('[AnalyticsDispatcher: ' + action + ']', ...args);
        Logger.type('analytics-dispatcher:' + action)
          .log(...args);
      }
    }

    super.dispatch(action, ...args);
  }
}

export default new AnalyticsDispatcher();


/** WEBPACK FOOTER **
 ** ./src/js/app/dispatchers/analytics_dispatcher.js
 **/