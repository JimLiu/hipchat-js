import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsActions from 'actions/analytics_actions';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import PreferencesStore from 'stores/preferences_store';
import spi from 'spi';

/**
 * Global actions intended for non react managed actions like mention clicks, etc.
 * @module actions/AppActions
 */
module.exports = {

  /**
   * Opens a chat based on an HTML element with a data-mention-name attribute.
   * Used primarily to allow hyperlinks to open a 1-1 chat by mention name.
   * @param {HTMLAnchorElement} target Hyperlink
   * @param {Attr} target.dataset.mentionName HipChat registered @-mention name of user
   */
  openChatByMentionName: function(target) {
    var mentionName = (typeof target === 'string') ? target : target.dataset.mentionName;
    AppDispatcher.dispatch('open-chat-by-mention-name', mentionName);
    AnalyticsActions.chatRoomMentionClicked();
  },

  /**
   * Open a chat by JID
   * @param data
   */
  openChatByJID: function(data){
    AppDispatcher.dispatch('set-route', {jid: data.jid});
    data.source = "jid";
    AnalyticsDispatcher.dispatch('analytics-open-room', data);
  },

  /**
   * Set route by JID
   * @param jid
   */
  navigateToChat: function(jid) {
    if (jid) {
      AppDispatcher.dispatch('set-route', {
        jid: jid
      });
    }
  },

  restoreRoomOrder(jid){
    AppDispatcher.dispatch('restore-room-order', {
      jid
    });
  },

  /**
   * Add file to the chat input for uploading via fileUrl
   * @param fileUrl
   * @param source dragndrop or paste
   */
  addFileForUploadWithUrl: function(fileUrl, source) {
    if (fileUrl) {
      AppDispatcher.dispatch('add-file-for-upload-with-url', {
        fileUrl: fileUrl,
        source: source
      });
    }
  },

  /**
   * Add file to the chat input for uploading via base64
   * @param base64 valid base64 string
   * @param fileName
   * @param source dragndrop or paste
   */
  addFileForUploadWithBase64: function(base64, fileName, source) {
    if (base64) {
      AppDispatcher.dispatch('add-file-for-upload-with-base64', {
        base64: base64,
        fileName,
        source
      });
    }
  },

  /**
   * Request addLive credentials from the server
   * @param jid
   * @param callback
   */
  requestAddLiveCredentials: function (jid, callback) {
    AppDispatcher.dispatch('request-addlive-credentials', { jid }, callback);
  },

  /**
   * Analytics event
   * @private
   */
  logoClicked: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.top.navigation.logo.clicked"
    });
  },

  /**
   * Enables an "experimental" feature in a way that can be triggered by Optimizely.  This will be added to the
   * features map on the hc.config object
   *
   * @param {String} featureName the name of the feature to enable
   * @param {String} user_jid user jid
   */
  enableDarkFeature: function(featureName, user_jid) {
    AppDispatcher.dispatch("enable-dark-feature", {name: featureName});

    var analyticsData = {
      name: "hipchat.client.darkfeature.enabled",
      feature: featureName,
      user_jid: user_jid
    };
    AnalyticsDispatcher.dispatch("analytics-event", analyticsData);
  },

  clearWebCookies: function (cb) {
    AppDispatcher.dispatch("clear-web-cookies", cb);
  },

  revokeOauth2Token: function (cb) {
    AppDispatcher.dispatch("revoke-oauth2-token", cb);
  },

  /**
   * Requests room participants from API v2.
   */
  fetchRoomParticipants: function (room, includeOffline) {
    AppDispatcher.dispatch("fetch-room-participants", room, includeOffline);
  },

  /**
   * Logs user out of /chat
   */
  signout: function() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.top.navigation.profile.signout.clicked"
    });
    AppDispatcher.dispatch('signout');
  },

  logInToAnotherTeam: function() {
    AnalyticsActions.logInToAnotherTeamClicked();
    spi.onLogInToAnotherTeam();
  },

  showNotification: function (options = {}, ...args) {
    if (PreferencesStore.shouldIssueNotification()) {
      let notification_types = Object.assign({}, PreferencesStore.getNotificationTypes(), options.notification_types);
      options.notification_types = notification_types;
      spi.onNotification(options, ...args);
    }
  },

  updateTotalUnreadCount: function() {
    spi.onTotalUnreadCountUpdate.apply(this, arguments);
  },

  openExternalWindow: function(...args) {
    spi.openExternalWindow(...args);
  },

  dismissReadOnlyModal: function() {
    AppDispatcher.dispatch('dismiss-read-only-modal');
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/app_actions.js
 **/