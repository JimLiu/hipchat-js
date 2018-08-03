/*global define*/

/**
 * A base implementation of the HipChat web client's SPI
 * to be implemented by native/non-native consumers
 *
 * @module SPIBase
 */
define("SpiBase", function () {
  function SpiBase () {}

  /**
   * Called when web core requests begin timing out
   *
   * @method onHostRequestTimeout
   */
  SpiBase.prototype.onHostRequestTimeout = function () {
    return false;
  };

  /**
   * Called when we want to bring the app to the foreground due to some activity
   * (e.g. dropping a file on the app)
   *
   * @method focusApp
   */
  SpiBase.prototype.focusApp = function () {
    return false;
  };

  /**
   * Fired when the preloader is dismissed and the application has fully loaded
   * Is passed the completed application configuration, including preferences.
   * See [ConfigurationModel]{@link class:ConfigurationModel}
   *
   * @method onAppStateReady
   * @param {ConfigurationModel} config
   */
  SpiBase.prototype.onAppStateReady = function (config) {
    return false;
  };

  /**
   * Fired when an error is caught when trying to re-establish a session
   * on reconnection
   *
   * @method onReconnectionError
   * @param {string} error
   */
  SpiBase.prototype.onReconnectionError = function (error) {
    return false;
  };

  /**
   * Fired when Strophe returns a status of CONNFAIL or AUTHFAIL
   * with a condition when the connection changes
   *
   * @method onStropheAuthFailed
   * @param {string} error
   */
  SpiBase.prototype.onStropheAuthFailed = function (error) {
    return false;
  };

  /**
   * Fired when Strophe returns a status of CONNFAIL or AUTHFAIL
   * without a condition when the connection changes
   *
   * @method onStropheConnectionFailed
   * @param {string} error
   */
  SpiBase.prototype.onStropheConnectionFailed = function (error) {
    return false;
  };

  /**
   * Fired when Strophe hits the 10 concurrent client max and session limit is reached.
   *
   * @method onStrophePolicyViolation
   * @param {object} data
   * @param {string} data.reason
   * @param {string} data.web_server
   */
  SpiBase.prototype.onStrophePolicyViolation = function (data) {
    return false;
  };

  /**
   * This method will be called to determine if the default
   * notification permission banner should be displayed
   *
   * @method getNotificationPermission
   * @static
   */
  SpiBase.prototype.getNotificationPermission = function () {
    return false;
  };

  /**
   * This method is called when the Desktop 4 release dialog is shown
   *
   * @method onDesktop4DialogShown
   */
  SpiBase.prototype.onDesktop4DialogShown = function () {
    return false;
  };

  /**
   * This method is called when the internal token is updated
   * @param {string} token - the new internal token data
   *
   * @method onInternalTokenRefreshed
   */
  SpiBase.prototype.onInternalTokenRefreshed = function (token) {
    return false;
  };

  /**
   * This method is called when a user select login into another team
   *
   * @method onLoginToAnotherTeam
   */
  SpiBase.prototype.onLoginToAnotherTeam = function() {
    return false;
  };

  /**
   * This method is called when web client logs a message. Note: this must be turned on via passing the config
   * property - logging_enabled: true
   * @returns {*}
   *
   * @method onLogMessage
   * @static
   */
  SpiBase.prototype.onLogMessage = function (data) {
    return false;
  };

  /**
   * This method will be called when a notification should be sent to the user
   * @param {Object} notification notification data
   * @param {string} notification.jid the jid this notification is associated with
   * @param {number} notification.group_id the group_id for the notification
   * @param {string} notification.group_name the group_name for the notification
   * @param {string} notification.title the title text for this notification (room/sender name)
   * @param {string} notification.body the notification body
   * @param {string} notification.html_body the notification html_body
   * @param {URL} notification.icon an icon to use for this notification
   * @param {Object} notification.notification_types key/value pairs of notification types and their permission
   * @returns {*}
   *
   * @method onNotification
   * @static
   */
  SpiBase.prototype.onNotification = function (notification) {
    return false;
  };

  /**
   * This method is called when a user preference has been changed
   * @returns {*}
   *
   * @method onPreferencesUpdated
   * @static
   */
  SpiBase.prototype.onPreferencesUpdated = function (data) {
    return false;
  };

  /**
   * This method is called when a user changes the active chat. It
   * passes an object with boolean properties to indicate what room
   * actions are currently available to the user in the active chat
   * based on room status, user permissions and enabled features.
   *
   * @param {object} data
   * @param {boolean} data.room_notifications
   * @param {boolean} data.integrations
   * @param {boolean} data.create_new_room
   * @param {boolean} data.invite_users
   * @param {boolean} data.remove_users
   * @param {boolean} data.enable_guest_access
   * @param {boolean} data.disable_guest_access
   * @param {boolean} data.archive_room
   * @param {boolean} data.unarchive_room
   * @param {boolean} data.change_topic
   * @param {boolean} data.change_privacy
   * @param {boolean} data.delete_room
   * @param {boolean} data.rename_room
   * @returns {boolean}
   */
  SpiBase.prototype.onRoomActionsChanged = function (data) {
    return false;
  };

  /**
   * This method is called when a user is signing out
   * @param {object} hc - HipChat client instance
   * @param {object} data - sign out data
   *
   * @method onSignOut
   */
  SpiBase.prototype.onSignOut = function (hc, data) {
    return false;
  };

  /**
   * This method will be called when a notification should be sent to the user
   * @param {Integer} count the current unread message count
   * @param {bool} hasMention if any of the unread messages include a user mention
   * @returns {*}
   *
   * @method onTotalUnreadCountUpdate
   * @static
   */
  SpiBase.prototype.onTotalUnreadCountUpdate = function (count, hasMention) {
    return false;
  };

  /**
   * This method is called when the web client explicitly wants to open a new window owned by HipChat.
   * To be used by video in order to launch a window inside the native wrapper and not the browser.
   * If you would like to open a new browser window see [openExternalWindow]{@link module:SPIBase.openExternalWindow} method.
   * @param {string} url - the url to open
   * @param {string} name - name of the new window
   * @param {string} props - see default window.open browser API for props
   * @returns {*}
   *
   * @method openInternalWindow
   * @static
   */
  SpiBase.prototype.openInternalWindow = function (url, name, props) {
    return false;
  };

  /**
   * This method is called when the web client wants to open a window in the browser. Note, this
   * method is a replacement for the default browser window.open API. In most SPI implementations
   * it will simply wrap window.open.
   * @param {string} url - the url to open
   * @param {string} name - name of the new window
   * @param {string} props - see default window.open browser API for props
   * @returns {*}
   *
   * @method openExternalWindow
   * @static
   */
  SpiBase.prototype.openExternalWindow = function (url, name, props) {
    return false;
  };

  /**
   * This method takes a promise and calls openExternalWindow once that promise is resolved. This
   * can be used as a work-around for popup blockers.
   *
   * @param promise
   */
  SpiBase.prototype.openExternalWindowWithPromise = function(promise) {
    return promise.then(function(url) {
      return this.openExternalWindow(url);
    }.bind(this));
  };

  /**
   * This method is called when an external feedback collector is specified and
   * the 'Provide Feedback' action is triggered by the user.
   * @param {string} url - the feedback url to use
   * @returns {*}
   *
   * @method showFeedbackCollector
   * @static
   */
  SpiBase.prototype.showFeedbackCollector = function (url) {
    return false;
  };

  /**
   * This method is called when the web client is giving the user a file chooser interface
   *
   * @returns {*}
   *
   * @method showFileChooser
   * @static
   */
  SpiBase.prototype.showFileChooser = function () {
    return false;
  };

  /**
   * This method is called when a user chooses to show app preference dialog (or window
   * if the implementation enables it)
   * @returns {*}
   *
   * @method showPreferencesDialog
   * @static
   */
  SpiBase.prototype.showPreferencesDialog = function () {
    if (window.HC && window.HC.api && window.HC.api.showPreferencesDialog) {
      console.log("showPreferencesDialog - implementation not found - showing default preferences dialog");
      return window.HC.api.showPreferencesDialog();
    }
    return false;
  };

  /**
   * This method is called when the Proxy Settings button is clicked
   *
   * @method buttonClickedProxySettings
   */
  SpiBase.prototype.buttonClickedProxySettings = function () {
    return false;
  };

  /**
   * This method is called when an unrecoverable error is encountered
   *
   * @method onUnrecoverableError
   * @param {string} type the error type encountered
   */
  SpiBase.prototype.onUnrecoverableError = function (type) {
    return false;
  };

  /**
   * This method is called by the service selector when the cloud login
   * page is going to be shown. It is native only.
   *
   * @method onCloudLoginShow
   */
  SpiBase.prototype.onCloudLoginShow = function () {
    return false;
  };

  /**
   * This method is called by the service selector when the server login
   * verification page is going to be shown. It is native only.
   *
   * @method onServerLoginShow
   */
  SpiBase.prototype.onServerLoginShow = function () {
    return false;
  };

  /**
   * This method is called by the service selector when a user will be
   * sent to download the legacy client. It is native only.
   *
   * @method onLegacyDownloadLinkClicked
   */
  SpiBase.prototype.onLegacyDownloadLinkClicked = function () {
    return false;
  };

  /**
   * This method is called by the service selector when it is time to do
   * the server oauth login flow. It is native only.
   *
   * @method onServerOauthLogin
   */
  SpiBase.prototype.onServerOauthLogin = function () {
    return false;
  };

  /**
   * This method is called by the service selector when it is time to get
   * the default value for lastServerUrl. It is native only.
   *
   * @method getLastServerUrl
   */
  SpiBase.prototype.getLastServerUrl = function () {
    return false;
  };

  /**
   * This method is called when we're creating a video session, and returns a promise which
   * resolves with a VideoWindow instance which looks like the following:
   *
   * {
   *    focus: function() {},
   *    close: function() {}
   * }
   *
   * @method initializeVideoWindow
   * @param {string} url - the url to point the external window to
   * @param {string} name - the name of the external window
   * @param {string} props - the properties of the external window, such as 'resizable=yes,width=400,height=300'
   * @param {string} passedWindow - optional, a prepared window already opened
   *
   * @returns {Promise<VideoWindow>} - returns a promise which resolves with a VideoWindow instance
   */
  SpiBase.prototype.initializeVideoWindow = function (url, name, props, passedWindow) {
    return new Promise(function (resolve) {
      resolve({
        focus: function () {
        },
        close: function () {
        }
      });
    });
  };

  /**
   * This method is called when we're preparing a video session, and returns
   * false unless we can prepare video windows.
   *
   * This is used to initiate the pop up before the token call, to bypass
   * popup blocking in browsers that occurs on an async popup.
   *
   * @method initializeVideoWindow
   * @param {string} name - the name of the external window
   * @param {string} props - the properties of the external window, such as 'resizable=yes,width=400,height=300'
   *
   * @returns {window} or {boolean}
   */
  SpiBase.prototype.prepareVideoWindow = function (name, props) {
    return false;
  };

  /**
   * Signals incoming video call invite
   *
   * @method handleVideoCallInvite
   * @param {Function} answerCall - the callback for answering call
   * @param {Function} declineCall - the callback for declining call
   * @param {Object} data additional call information
   * @property {string} data.id - the invite id
   * @property {string} data.avatar - caller avatar url
   * @property {string} data.name - caller name
   */
  SpiBase.prototype.handleVideoCallInvite = function (answerCall, declineCall, data) {
    return false;
  };


  /**
   * Signals video call invite end
   *
   * @method dismissVideoCallInvite
   * @param {string} id - the invite id
   */
  SpiBase.prototype.dismissVideoCallInvite = function (id) {
    return false;
  };

  /**
   * @method hasActiveVideoSession
   * @returns {Promise}
   */
  SpiBase.prototype.hasActiveVideoSession = function () {
    return new Promise(function (resolve) {
      resolve(false);
    });
  };

  /**
   * This method is called when the user attempts to begin a call
   */
  SpiBase.prototype.callPlaced = function(jid, profile) {
    return false;
  };

  /**
   * This method is called when the user answers a call
   */
  SpiBase.prototype.callAnswered = function(jid, profile) {
    return false;
  };

  /**
   * This method is called when the user's call is declined
   */
  SpiBase.prototype.callDeclined = function(jid, profile) {
    return false;
  };

  /**
   * This method is called when the user's call is ended
   */
  SpiBase.prototype.callHungup = function(jid, profile) {
    return false;
  };

  /**
   * Used to signal native that the addlive credentials for this call are received
   *
   * @typedef {object} AddLiveCredentials
   * @property {number} credentials.app_id
   * @property {number} credentials.user_id
   * @property {string} credentials.scope_id
   * @property {string} credentials.salt
   * @property {number} credentials.expires
   * @property {string} credentials.signature
   */
  SpiBase.prototype.addLiveCredentialsReceived = function(credentials) {
    return false;
  };

  /**
   * This method is called by the file viewer when we want to download a file directly
   *
   * @method downloadFile
   * @param {string} url - the download url
   */
  SpiBase.prototype.downloadFile = function (url) {
    return false;
  };

  /**
   * This method is called by the FileViewer to fetch assets
   *
   * @method fetchPdfViewerResources
   * @param {string} moduleName
   * @param {string} baseUri - base URI from AppStore
   *
   * @returns {Promise}
   */
  SpiBase.prototype.fetchPdfViewerResources = function(moduleName, baseUri) {
    return new Promise(function (resolve) {
      resolve(true);
    });
  };

  /**
   * This method is called whenever the user's status changes
   *
   * @method onChangeUserStatus
   * @param {string} status - ['chat', 'away', 'xa', 'dnd', 'unavailable']
   */
  SpiBase.prototype.onChangeUserStatus = function(status) {
    return false;
  };

  /**
   * This method is called whenever the active "chat" changes
   *
   * @method onChangeActiveChat
   * @param {boolean} isChat - indicates whether the newly active chat is actually
   *          a chat or is something else like the Lobby or Search results
   */
  SpiBase.prototype.onChangeActiveChat = function(isChat) {
    return false;
  };

  return SpiBase;
});



/** WEBPACK FOOTER **
 ** ./src/js/lib/spi.js
 **/