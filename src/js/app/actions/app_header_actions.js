/**
 * Used to trigger actions on the application header
 * @module actions/AppHeaderActions
 */

var AppDispatcher = require('dispatchers/app_dispatcher');
var AnalyticsDispatcher = require('dispatchers/analytics_dispatcher');
var DialogActions = require('actions/dialog_actions');
var InlineDialogActions = require('actions/inline_dialog_actions');
var spi = require('spi');

module.exports = {

  requestReleaseNotesDialog: function() {
    DialogActions.showReleaseNotesDialog();
  },

  /**
   * Displays settings dialog
   */
  requestPreferencesDialog: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.top.navigation.profile.settings.clicked"
    });

    spi.showPreferencesDialog();
  },

  /**
   * Hides inline dialog for status message update
   */
  hideStatusMessageForm: function() {
    InlineDialogActions.hideInlineDialog();
  },

  /**
   * Analytics event
   * @private
   */
  helpButtonClicked: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.top.navigation.help.clicked"
    });
  },

  /**
   * Analytics event
   * @private
   */
  userProfileDropdownClicked: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.top.navigation.profile.clicked"
    });
  },

  /**
   * Sets focus to search box
   * @param jid JID of the currently selected chat
   */
  searchHistory: function(jid, text) {
    AppDispatcher.dispatch('set-route', {jid: 'search'});
    AppDispatcher.dispatch("search-history", {jid: jid, text: text});
  },

  /**
   * Executes search in external HipChat search page by launching a new tab/window
   * @param jid JID of the currently selected chat
   */
  searchHistoryExternally: function(jid, text) {
    AppDispatcher.dispatch("search-history-externally", {jid: jid, text: text});
  },

  /**
   * Sets the search text inside the search input field
   * @param {object} data
   * @param {string} data.text Search query
   */
  setSearchText: function(data) {
    AppDispatcher.dispatch('set-search-text', data);
  },

  /**
   * Remove focus from search input field
   */
  searchBlurred: function() {
    AppDispatcher.dispatch("blur-search");
  },

  /**
   * Dismiss the notification permission banner that appears when the user
   * first uses the chat client. This method just dismisses it temporarily.
   * If you want to dismiss it forever, use the dismissNotificationBannerForever()
   * method.
   */
  dismissNotificationBanner: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.banner.notification.dismiss.once"
    });
    AppDispatcher.dispatch('dismiss-notification-banner');
  },

  /**
   * Dismiss the notification permission banner that appears when the user
   * first uses the chat client. This method just dismisses it forever.
   * If you want to dismiss it temporarily, use the dismissNotificationBanner()
   * method.
   */
  dismissNotificationBannerForever: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.banner.notification.dismiss.forever"
    });
    AppDispatcher.dispatch('dismiss-notification-banner-forever');
  },

  /**
   * Triggers the HTML5 notification permission prompt
   */
  requestNotificationPermission: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.banner.notification.request.permission"
    });
    AppDispatcher.dispatch('request-notification-permission');
  },

  /**
   * Dispatch event to reposition active dialogs in the app header
   */
  positionDialogs: function() {
    AppDispatcher.dispatch('position-app-header-dialogs');
  }

};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/app_header_actions.js
 **/