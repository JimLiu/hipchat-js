import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import AppDispatcher from 'dispatchers/app_dispatcher';

export default {

  filesMounted: function(data) {
    AnalyticsDispatcher.dispatch('analytics-files-mount', data);
  },

  rosterMounted: function(data) {
    AnalyticsDispatcher.dispatch('analytics-roster-mount', data);
  },

  fetchFilesHistory(){
    AppDispatcher.dispatch('fetch-files-history');
  },

  fetchLinksHistory(){
    AppDispatcher.dispatch('fetch-links-history');
  },

  setPanelScrollTopPosition(data){
    AppDispatcher.dispatch('set-right-sidebar-panel-scrolltop', data);
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/right_panel_actions.js
 **/