import Timer from 'core/common/timer';
import CurrentUserActions from 'actions/current_user_actions';
import Logger from 'helpers/logger';
import ConfigStore from 'stores/configuration_store';
import PreferencesStore from 'stores/preferences_store';
import ConnectionManager from 'core/xmpp/connection_manager';

const STATE = Symbol.for('HJC.Idle.Manager.State');

/**
 * Manage Idle for the web
 */
class IdleManager {

  constructor() {

    /**
     * Internal state
     */
    this[STATE] = {
      isIdle: false,
      isRunning: false,
      lastUserAction: new Date().getTime()
    };

    /**
     * Timer to set the user to idle
     */
    this.idleTimer = new Timer(this._onUserIdle.bind(this), PreferencesStore.get('idleMinutes') * 60 * 1000);

    /**
     * Timer to check for activity, in order to return from idle
     */
    this.activityTimer = new Timer(this._checkForActivity.bind(this), 1000);
  }

  /**
   * Bootstrap the idle stuff. Only do this on web, NOT in native
   */
  start() {
    if (ConfigStore.get('client_type') === 'web' && !this.isRunning()) {
      let delay = PreferencesStore.get('idleMinutes') * 60 * 1000;
      $(document).on('mousemove.idle keydown.idle DOMMouseScroll.idle mousewheel.idle mousedown.idle', () => {
        this[STATE].lastUserAction = new Date().getTime();
      });
      this.idleTimer.resetTime(delay).start();
      this.activityTimer.start();
      this[STATE].isRunning = true;
      Logger.info('[IdleManager] starting idle timers & events');
    }
  }

  /**
   * Stop idle management
   */
  stop() {
    this.idleTimer.clear();
    this.activityTimer.clear();
    $(document).off('mousemove.idle keydown.idle DOMMouseScroll.idle mousewheel.idle mousedown.idle');
    this[STATE].isRunning = false;
    Logger.info('[IdleManager] stopping idle timers & events');
  }

  /**
   * Ask if the user is idle
   * @method isIdle
   * @returns {boolean|IdleManager.isIdle}
   */
  isIdle() {
    return this[STATE].isIdle;
  }

  /**
   * Check if the idle manager is already running
   */
  isRunning() {
    return this[STATE].isRunning;
  }

  /**
   * Callback fired when the idle timer runs all the way down
   * @private
   */
  _onUserIdle() {
    if (!ConnectionManager.isConnected()) {
      return;
    }

    Logger.info('[IdleManager] Going idle');
    this[STATE].isIdle = true;
    CurrentUserActions.goIdle();
  }

  /**
   * Checks current time against last activity time to see if the
   * user has taken action
   * @private
   */
  _userHasTakenActionInTheLastSecond() {
    return (new Date().getTime() - this[STATE].lastUserAction) < 1000;
  }

  /**
   * Fired every second to check when the last user activity was
   * @private
   */
  _checkForActivity() {
    if (this._userHasTakenActionInTheLastSecond()) {
      if (!ConnectionManager.isConnected()) {
        return;
      }

      this.idleTimer.restart();
      if (this.isIdle()) {
        Logger.info('[IdleManager] Returning from idle');
        this[STATE].isIdle = false;
        CurrentUserActions.returnToActive();
      }
    }
    this.activityTimer.restart();
  }

  /**
   * Used for testing
   */
  reset() {
    this[STATE].isIdle = false;
    this[STATE].lastUserAction = new Date().getTime();
    this.stop();
  }

}

export default new IdleManager();



/** WEBPACK FOOTER **
 ** ./src/js/core/idle/idle_manager.js
 **/