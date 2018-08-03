import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import Presence from 'lib/enum/presence';

export default {

  goIdle() {
    AppDispatcher.dispatch('set-current-user-idle');
    AnalyticsDispatcher.dispatch('analytics-update-presence', { show: Presence.IDLE });
  },

  returnToActive() {
    AppDispatcher.dispatch('set-current-user-active');
  },

  changeStatus({ show = Presence.AVAILABLE, status = '', type = '' } = {}) {
    AppDispatcher.dispatch('set-current-user-status', { show, status });

    if (type === 'show') {
      AnalyticsDispatcher.dispatch('analytics-update-presence', { show });
    } else if (type === 'status') {
      AnalyticsDispatcher.dispatch('analytics-update-status-message', { status });
    } else if (type === 'showAndStatus') {
      AnalyticsDispatcher.dispatch('analytics-update-presence', { show });
      AnalyticsDispatcher.dispatch('analytics-update-status-message', { status });
    }
  },

  onCall() {
    AppDispatcher.dispatch('user-on-call');
  },

  leaveCall(){
    AppDispatcher.dispatch('user-leave-call');
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/current_user_actions.js
 **/