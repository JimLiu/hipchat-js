var AppDispatcher = require('dispatchers/app_dispatcher');
var AnalyticsDispatcher = require('dispatchers/analytics_dispatcher');

var SidebarActions = {
  openChat: function(data) {
    AppDispatcher.dispatch('set-route', {jid: data.jid});
    data.source = "sidebar";
    AnalyticsDispatcher.dispatch('analytics-open-room', data);
  }
};

module.exports = SidebarActions;


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/sidebar_actions.js
 **/