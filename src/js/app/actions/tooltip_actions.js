/**
 * TooltipActions
 */

var AppDispatcher = require('dispatchers/app_dispatcher');
var AnalyticsDispatcher = require('dispatchers/analytics_dispatcher');


var TooltipActions = {

  showTooltip: function(data) {
    AppDispatcher.dispatch('show-tooltip', data);
  },

  smileyChosen: function(data) {
    AppDispatcher.dispatch('smiley-chosen', data);
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.emoticon.dialog.emoticon.clicked",
      properties: {
        emoticonString: data.shortcut
      }
    });
  },

  moreEmoticonsChosen: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.emoticon.dialog.more.clicked"
    });
  },

  customEmoticonsChosen: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.emoticon.dialog.custom.clicked"
    });
  }

};

module.exports = TooltipActions;


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/tooltip_actions.js
 **/