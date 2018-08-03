/**
 * The HipChat web client's top level API,
 * for use by native wrappers and experiments.
 *
 * @module API
 */
import AppDispatcher from 'dispatchers/app_dispatcher';
import PreferencesActions from 'actions/preferences_actions';
import PreferencesStore from 'stores/preferences_store';
import DialogActions from 'actions/dialog_actions';
import LayoutActions from 'actions/layout_actions';
import CurrentUserActions from 'actions/current_user_actions';
import AppStore from 'stores/application_store';
import ChatHeaderStore from 'stores/chat_header_store';
import ChatInputStore from 'stores/chat_input_store';
import ConfigStore from 'stores/configuration_store';
import RosterStore from 'stores/roster_store';
import AppConfig from 'config/app_config';
import ChatInputActions from 'actions/chat_input_actions';
import ChatHeaderActions from 'actions/chat_header_actions';
import RoomDropDownActions from 'actions/room_dropdown_actions';
import utils from 'helpers/utils';
import logger from 'helpers/logger';
import RoomNavActions from 'actions/room_nav_actions';
import ConnectionActions from 'actions/connection_actions';
import AppActions from 'actions/app_actions';
import sentryHelper from 'helpers/sentry_helper';
import NetworkStatusActions from 'actions/network_status_actions';
import IntegrationHelper from 'helpers/integration_helper';
import FileUploaderActions from "actions/file_uploader_actions";
import VideoActions from 'actions/video_actions';
import VideoServiceKeys from 'keys/video_service_keys';
import DALError from 'core/models/dal-error';
import spi from 'spi';


function _isVideoEnabled(jid = '') {
  let isChat = utils.jid.is_chat(jid);
  let isRoom = utils.jid.is_room(jid);

  if (!isChat) {
    return false;
  }

  let video_enabled = ChatHeaderStore.get('video_enabled');
  let enso_enabled = ChatHeaderStore.get('web_client_enso_video_enabled');
  let room_enabled = ChatHeaderStore.get('web_client_enso_room_video_enabled');

  if (isRoom) {
    return video_enabled && enso_enabled && room_enabled;
  }
  return video_enabled;
}


class API {

  constructor() {

    /**
     * @type {object}
     * @property {number} ConnectionStatus.CONNECTED 1
     * @property {number} ConnectionStatus.CONNECTING 2
     * @property {number} ConnectionStatus.DISCONNECTED 3
     * @property {number} ConnectionStatus.DISCONNECTING 4
     * @property {number} ConnectionStatus.NETWORK_DOWN 5
     * @property {number} ConnectionStatus.NETWORK_UP 6
     * @property {number} ConnectionStatus.ERROR 0
     *
     * @constant ConnectionStatus
    */
    this.ConnectionStatus = {
      CONNECTED: 1,
      CONNECTING: 2,
      DISCONNECTED: 3,
      DISCONNECTING: 4,
      NETWORK_DOWN: 5,
      NETWORK_UP: 6,
      SUSPEND: 7,
      ERROR: 0
    };

    /**
     * @type {object}
     * @property {string} FileUploaderErrors.FILE_TOO_LARGE 'file_too_large'
     * @property {string} FileUploaderErrors.FILE_IS_FOLDER 'file_is_folder'
     * @property {string} FileUploaderErrors.UNABLE_TO_UPLOAD 'unable_to_upload'
     *
     * @constant FileUploaderErrors
     */
    this.FileUploaderErrors = {
      FILE_TOO_LARGE: 'file_too_large',
      FILE_IS_FOLDER: 'file_is_folder',
      UNABLE_TO_UPLOAD: 'unable_to_upload'
    };
  }

  /**
   * Gets the init data received by the web client
   * from the server on initial connect. Filtered
   * to data pertinente to native clients
   * @param {object} initData the web client's initialization data
   * @param {string} initData.user_jid the jid of the current user
   * @param {string} initData.user_id the user id of the current user
   * @param {string} initData.group_id the group id of the current group
   * @param {string} initData.group_name the name of the current group
   * @param {string} initData.photo_large a large version of the current users avatar image
   * @param {string} initData.photo_small a small version of the current users avatar image
   * @param {string} initData.oauth_token the oauth2_token for the currently logged in user
   * @param {object} initData.apiv1_token the api token information for the currently logged in user
   * @returns {object|false} returns false if init data not received by web client
   *
   * @method getInitData
   * @static
   */
  getInitData() {
    if (!AppStore.local.initialized) {
      return false;
    }

    var current_user = AppStore.get("current_user");
    return _.merge({}, {
      user_jid: current_user.user_jid,
      user_id: current_user.user_id,
      photo_large: current_user.photo_large,
      photo_small: current_user.photo_small,
      oauth_token: ConfigStore.getOAuthToken(),
      apiv1_token: ConfigStore.getApiV1Token(),
      group_id: AppStore.get("group_id"),
      group_name: AppStore.get("group_name")
    });
  }

  /**
   * Gets the current user's server and client preferences
   * see {@link prefs} for keys
   * @returns {Object} prefs the user/client prefs
   *
   * @method getPreferences
   * @static
   */
  getPreferences() {
    return PreferencesStore.getAll();
  }

  /**
   * Get a user object by name
   *
   * @param {string} name user name query
   * @returns {Object} the found user object or undefined if not found
   *
   * @method getUserByName
   * @static
   */
  getUserByName(name) {
    if (_.isString(name)) {
      var roster = AppStore.get("roster");
      var result = _.find(roster, function (user) {
        if (_.has(user, "name")) {
          return name.toLowerCase() === user.name.toLowerCase();
        }
      });
      return result;
    }
  }

  /**
   * Get a user object by @mention
   *
   * @param {string} mention user mention query
   * @returns {Object} the found user object or undefined if not found
   *
   * @method getUserByMention
   * @static
   */
  getUserByMention(mention) {
    if (_.isString(mention)) {
      mention = (mention.charAt(0) === "@") ? mention.slice(1) : mention;
      var roster = AppStore.get("roster");
      var result = _.find(roster, function (user) {
        if (_.has(user, "mention_name")) {
          return mention.toLowerCase() === user.mention_name.toLowerCase();
        }
      });
      return result;
    }
  }

  /**
   * Request Addlive credentials from the server
   *
   * @method requestAddLiveCredentials
   * @returns {Promise<AddLiveCredentials, AddLiveCredentialsError>}
   */
  requestAddLiveCredentials() {
    return new Promise((resolve, reject) => {
      AppActions.requestAddLiveCredentials(ConfigStore.get('jid'), (error, data) => {
        if (error) {
          /**
           * @typedef {object} AddLiveCredentialsError
           * @property {integer} code
           * @property {string} message
           */
          return reject({
            message: _.get(error, 'text.__text', ''),
            code: parseInt(error.code, 10)
          });
        }
        /**
         * @typedef {object} AddLiveCredentials
         * @property {integer} app_id
         * @property {integer} user_id
         * @property {string} scope_id
         * @property {string} salt
         * @property {number} expires
         * @property {string} signature
         */
        resolve({
          app_id: parseInt(data.app_id, 10),
          user_id: parseInt(data.user_id, 10),
          scope_id: data.scope_id,
          salt: data.salt,
          expires: parseInt(data.expires, 10),
          signature: data.signature
        });
      });
    });
  }

  /**
   * Joins an AddLive video call
   *
   * @param {String} jid The JID that the call is connecting to
   * @param {Boolean} audio_only Whether or not to exclude video
   */
  joinAddLiveCall(jid, audio_only = false) {
    VideoActions.joinAddLiveCall({
      jid: jid,
      audio_only: audio_only
    });
  }

  /**
   * Leaves an AddLive video call
   *
   * @param {String} jid The JID that the call is connecting to
   */
  leaveAddLiveCall(jid) {
    VideoActions.endAddLiveVideoSession(jid);
    VideoActions.leaveAddLiveCall(jid);
  }

  /**
   * Notifies the web app that the connection has changed
   *
   * @param {number} connectionStatus see {@link module:API~ConnectionStatus} for values
   * @param {function} [callback=noop]
   *
   * @example
   *  // onConnectionChanged(HC.api.ConnectionStatus.CONNECTED)
   * @method onConnectionChanged
   * @static
   */
  onConnectionChanged(ConnectionStatus, callback = _.noop) {
    switch (ConnectionStatus) {
      case this.ConnectionStatus.CONNECTED:
        AppDispatcher.registerOnce('after:strophe-reconnected', callback);
        ConnectionActions.reconnect();
        break;
      case this.ConnectionStatus.CONNECTING:
        break;
      case this.ConnectionStatus.DISCONNECTED:
        ConnectionActions.disconnect(true);
        break;
      case this.ConnectionStatus.DISCONNECTING:
        break;
      case this.ConnectionStatus.ERROR:
        logger.error("Connection error");
        break;
      case this.ConnectionStatus.NETWORK_DOWN:
        NetworkStatusActions.onNetworkDown();
        break;
      case this.ConnectionStatus.NETWORK_UP:
        NetworkStatusActions.onNetworkUp();
        break;
      case this.ConnectionStatus.SUSPEND:
        AppDispatcher.registerOnce('after:strophe-disconnected', callback);
        ConnectionActions.disconnect(false);
        break;
      default:
        logger.error("Connection status invalid");
        break;
    }
  }

  /**
   * Sets preferences
   * User/server preferences will be automatically sorted and synced appropriately
   * User preferences are synced to localStorage, while server preferences are
   * synced via the /preferences api
   *
   * @param {Object.<key, value>} prefs see {@link prefs} for accepted keys
   *
   * @method setPreferences
   * @static
   */
  setPreferences(prefs) {
    PreferencesActions.savePreferences(prefs);
  }

  /**
   * Sets user idle status
   * Supports {"idle": boolean} and {"show": string} currently.
   *
   * @param {Object.<key, value>} - {"idle": true} or {"idle": false} or {"show": "chat|away|xa|dnd|unavailable"}
   *
   * @method setUserStatus
   * @static
   */
  setUserStatus(userStatus) {
    if (typeof userStatus !== "object") { return logger.error("API: setUserStatus: object expected"); }

    if (userStatus.show) {
      CurrentUserActions.changeStatus(userStatus);
    } else if (userStatus.idle) {
      CurrentUserActions.goIdle();
    } else {
      CurrentUserActions.returnToActive();
    }
  }

  /**
   * Open the lobby
   *
   * @method openLobby
   * @static
   */
  openLobby() {
    RoomNavActions.openLobby();
  }

  /**
   * Open the quick switcher
   *
   * @method openQuickSwitcher
   * @static
   */
  openQuickSwitcher() {
    DialogActions.showQuickSwitcherDialog();
  }

  /**
   * Open a chat - room or 1-to-1
   *
   * @param {Object.<key, value>} - {"jid": "jid"}
   *
   * @method openChat
   * @static
   */
  openChat(data) {
    AppActions.openChatByJID(data);
    this.focusChatInput();
  }

  /**
   * Places focus in the chat input
   *
   * @method focusChatInput
   * @static
   */
  focusChatInput() {
    let chatInput = document.getElementById(AppConfig.chat_input_id);

    if (chatInput) {
      chatInput.focus();
    }
  }

  /**
   * Open the create room dialog
   *
   * @param {Object.<key, value>} - {"room_name": "room name", "room_topic": "topic", "privacy": "private" || "public"}
   *
   * @method createRoom
   * @static
   */
  createRoom(data) {
    let actions = ChatHeaderStore.getCurrentRoomActions();
    if (actions.create_new_room) {
      DialogActions.showCreateRoomDialog(data);
    }
  }

  /**
   * Open the delete room dialog
   *
   * @method deleteRoom
   */
  deleteRoom() {
    let actions = ChatHeaderStore.getCurrentRoomActions(),
      { jid, name } = ChatHeaderStore.get('chat');
    if (actions.delete_room) {
      DialogActions.showDeleteRoomDialog({ jid, name });
    }
  }

  /**
   * Open the invite users dialog
   *
   * @method inviteUsersToRoom
   * @static
   */
  inviteUsersToRoom() {
    let actions = ChatHeaderStore.getCurrentRoomActions();
    if (actions.invite_users) {
      DialogActions.showInviteUsersDialog();
    }
  }

  /**
   * Open the remove users dialog
   *
   * @method removeUsersFromRoom
   */
  removeUsersFromRoom() {
    let actions = ChatHeaderStore.getCurrentRoomActions();
    if (actions.remove_users) {
      DialogActions.showRemoveUsersDialog();
    }
  }

  /**
   * blur the app
   *
   * @method blurApp
   * @static
   */
  blurApp() {
    AppDispatcher.dispatch("application-blurred");
  }

  /**
   * focus the app
   *
   * @method focusApp
   * @static
   */
  focusApp() {
    AppDispatcher.dispatch("application-focused");
  }

  /**
   * Focus the search input
   *
   * @method focusSearch
   * @static
   */
  focusSearch() {
    AppDispatcher.dispatch("focus-search");
  }


  /**
   * Gets information about the active chat - room or 1-to-1
   * @returns {Object}
   *
   * @method getActiveChat
   * @static
   */
  getActiveChat() {
    var jid = AppStore.get("active_chat");
    var activeChat = AppStore.data.activeRooms[jid];

    return activeChat;
  }

  /**
   * Get the list of actions that can be taken on the currently active room
   *
   * @method getCurrentRoomActions
   * @return {object}
   */
  getCurrentRoomActions() {
    return ChatHeaderStore.getCurrentRoomActions();
  }

  /**
   * Open a new external window pointed to the integrations url for current user/room
   *
   * @method openIntegrationsWindow
   */
  openIntegrationsWindow() {
    let actions = ChatHeaderStore.getCurrentRoomActions();
    if (actions.integrations) {
      spi.openExternalWindow(IntegrationHelper.getIntegrationsUrl(
        ConfigStore.get('web_server'),
        ChatHeaderStore.get('chat').id,
        ConfigStore.get('user_id'),
        IntegrationHelper.API_SOURCE_ID
      ));
    }
  }

  /**
   * Opens room notifications dialog, if you are in a group chat
   * and room notifications are enabled
   *
   * @method openRoomNotificationsDialog
   */
  openRoomNotifications() {
    let actions = ChatHeaderStore.getCurrentRoomActions(),
      { jid, name: room_name } = ChatHeaderStore.get('chat');
    if (actions.room_notifications) {
      DialogActions.showRoomNotificationsDialog({ jid, room_name });
    }
  }

  /**
   * Archive the currently open room
   *
   * @method archiveRoom
   */
  archiveRoom() {
    let actions = ChatHeaderStore.getCurrentRoomActions();
    if (actions.archive_room) {
      DialogActions.showArchiveRoomDialog({ archive: true });
    }
  }

  /**
   * Unarchive the currently open room
   *
   * @method unarchiveRoom
   */
  unarchiveRoom() {
    let actions = ChatHeaderStore.getCurrentRoomActions();
    if (actions.unarchive_room) {
      DialogActions.showArchiveRoomDialog({ archive: false });
    }
  }

  /**
   * Open the edit room topic input in the chat header
   *
   * @method changeRoomTopic
   */
  changeRoomTopic() {
    let actions = ChatHeaderStore.getCurrentRoomActions();
    if (actions.change_topic) {
      RoomDropDownActions.editTopic();
    }
  }

  /**
   * Open the change room privacy dialog
   *
   * @method changeRoomPrivacy
   */
  changeRoomPrivacy() {
    let actions = ChatHeaderStore.getCurrentRoomActions(),
      { jid, name, privacy } = ChatHeaderStore.get('chat');
    if (actions.change_privacy) {
      DialogActions.showRoomPrivacyDialog({ jid, name, privacy });
    }
  }

  /**
   * Open the rename room dialog
   *
   * @method renameRoom
   */
  renameRoom() {
    let actions = ChatHeaderStore.getCurrentRoomActions(),
      { jid, name } = ChatHeaderStore.get('chat');
    if (actions.rename_room) {
      DialogActions.showRenameRoomDialog({ jid, name });
    }
  }

  /**
   * Enable guest access in the current room
   *
   * @method enableGuestAccess
   */
  enableGuestAccess() {
    let actions = ChatHeaderStore.getCurrentRoomActions(),
      { jid } = ChatHeaderStore.get('chat');
    if (actions.enable_guest_access) {
      RoomDropDownActions.enableGuestAccess({ jid });
    }
  }

  /**
   * Show disable guest access dialog
   *
   * @method disableGuestAccess
   */
  disableGuestAccess() {
    let actions = ChatHeaderStore.getCurrentRoomActions();
    if (actions.disable_guest_access) {
      DialogActions.showDisableGuestAccessDialog();
    }
  }

  /**
   * Close the currently open chat (if it can be)
   *
   * @method closeActiveChat
   * @static
   */
  closeActiveChat() {
    var jid = AppStore.get("active_chat");
    if (utils.jid.is_chat(jid)) {
      RoomNavActions.close(jid, utils.room.detect_chat_type(jid));
    } else if (utils.jid.is_search(jid)) {
      this.closeSearchResults();
    }
  }

  /**
   * Close the currently open search results (if it can be)
   *
   * @method closeSearchResults
   * @static
   */
  closeSearchResults() {
    RoomNavActions.closeSearchResults();
  }

  /**
   * Gets information about the active chat - room or 1-to-1
   * @returns {Object}
   *
   * @method getActiveChat
   * @static
   */
  getActiveChats() {
    return AppStore.data.activeRooms;
  }

  /**
   * Navigate to the chat opened above this one,
   * if this is the first chat, navigate to the last
   *
   * @method navigateChatUp
   * @static
   */
  navigateChatUp() {
    AppDispatcher.dispatch('navigate-rooms', {
      direction: "up"
    });
  }

  /**
   * Navigate to the chat opened below this one,
   * if this is the last chat, navigate to the first
   *
   * @method navigateChatDown
   * @static
   */
  navigateChatDown() {
    AppDispatcher.dispatch('navigate-rooms', {
      direction: "down"
    });
  }

  /**
   * Navigate to the chat at the top of your list.  If you are at the top chat,
   * or there are no chats open, this will do nothing.
   *
   * @method navigateToTopChat
   * @static
   */
  navigateToTopChat() {
    AppDispatcher.dispatch('navigate-rooms', {
      direction: "top"
    });
  }

  /**
   * Navigate to the chat at the bottom of your list.  If you are at the bottom chat,
   * or there are no chats open, this will do nothing.
   *
   * @method navigateToBottomChat
   * @static
   */
  navigateToBottomChat() {
    AppDispatcher.dispatch('navigate-rooms', {
      direction: "bottom"
    });
  }

  /**
   * Navigate to the chat at the index specified.  If no chat is found at that index
   * this will do nothing.
   *
   * @method navigateToChatAtIndex
   * @static
   */
  navigateToChatAtIndex(index) {
    AppDispatcher.dispatch('navigate-rooms', {
      direction: "index",
      index: index
    });
  }

  /**
   * Open the modal preferences dialog
   *
   * @method showPreferencesDialog
   * @static
   */
  showPreferencesDialog() {
    DialogActions.showSettingDialog();
  }

  /**
   * Toggle sound notifications
   *
   * @method toggleSoundNotifications
   * @static
   */
  toggleSoundNotifications() {
    AppDispatcher.dispatch('toggle-sound-notifications');
  }

  /**
   * Clear unread message counts
   *
   * @method markChatsAsRead
   * @static
   */
  markChatsAsRead() {
    AppDispatcher.dispatch('mark-chats-as-read');
  }

  /**
   * Clear unread message counts for rooms only
   *
   * @method markRoomsAsRead
   * @static
   */
  markRoomsAsRead() {
    AppDispatcher.dispatch('mark-rooms-as-read');
  }

  /**
   * Clear unread message counts for people only
   *
   * @method markPeopleAsRead
   * @static
   */
  markPeopleAsRead() {
    AppDispatcher.dispatch('mark-people-as-read');
  }

  /**
   * Send a message
   *
   * @param {Object.<key, value>} - {"text": "text message", "jid": "jid"}
   *
   * @method sendMessage
   * @static
   */
  sendMessage(data) {
    data.id = data.id || ChatInputStore.get("message_id");
    data.text = utils.strings.stripHiddenCharacters(data.text);
    data.source = "api";
    ChatInputActions.sendMessage(data);
  }

  /**
   * Append text to the current message
   *
   * @param data Expects the parameter data.text, which should be the text to append
   */
  appendMessage(data) {
    let text = data.text;

    ChatInputActions.appendMessage({text: text});
  }

  /**
   * Open the invite a teammate dialog
   *
   * @method showInviteTeammatesDialog
   * @static
   */
  showInviteTeammatesDialog() {
    DialogActions.showInviteTeammatesDialog();
  }

  /**
   * Reopen the last closed chat
   *
   * @method reopenLastChat
   * @static
   */
  reopenLastChat() {
    var last_chat_jid = AppStore.getLastClosedChat();

    if (last_chat_jid) {
      AppActions.navigateToChat(last_chat_jid);
      AppActions.restoreRoomOrder(last_chat_jid);
    }
  }

  /**
   * Recall older message from input history
   *
   * @method recallOlderInputHistory
   * @static
   */
  recallOlderInputHistory(e) {
    AppDispatcher.dispatch('recall-older-message', e);
  }

  /**
   * Recall newer message from input history
   *
   * @method recallNewerInputHistory
   * @static
   */
  recallNewerInputHistory(e) {
    AppDispatcher.dispatch('recall-newer-message', e);
  }

  /**
   * Show the Desktop 4.0 release dialog - content provided
   * by wrappers via api or config.release_dialog_content
   *
   * @param {object} dialogData
   * @param {boolean} dialogData.bgDismiss allow the modal to be dismissed by a background click
   * @param {boolean} dialogData.assetBaseUri the asset base uri
   * @param {object} dialogData.content the content for the release dialog
   * @param {string} dialogData.content.title the title for the dialog
   * @param {string} dialogData.content.intro the intro text
   * @param {array} dialogData.content.bullets the bullet points for the dialog
   * @param {string} dialogData.content.outro the outro text
   * @param {string} dialogData.content.cta the call to action button text
   *
   * @method showDesktop4Dialog
   * @static
   */
  showDesktop4Dialog(dialogData) {
    let content = _.isObject(_.get(dialogData, "content")) ? dialogData.content : AppStore.get("release_dialog_content") || {},
        bgDismiss = _.has(dialogData, "bgDismiss") ? dialogData.bgDismiss : true,
        data = {
          bgDismiss: bgDismiss,
          content: content
        };
    DialogActions.showDesktop4Dialog(data);
  }

  /**
   * Add a file to the chat input for uploading via fileUrl
   *
   * @param fileUrl
   * @param source dragndrop or paste
   *
   * @method addFileForUploadWithUrl
   * @static
   */
  addFileForUploadWithUrl(fileUrl, source) {
    if (fileUrl) {
      AppActions.addFileForUploadWithUrl(fileUrl, source);
    }
  }

  /**
   * Add a file to the chat input for uploading via base64 string
   *
   * @param base64 valid base64 string
   * @param {string|null} [fileName]
   * @param {string} source - paste or dragndrop
   *
   * @method addFileForUploadWithBase64
   * @static
   */
  addFileForUploadWithBase64(base64, fileName = null, source) {
    if (ChatInputStore.get('uploading')){
      return false;
    }

    if (_.includes(['paste', 'dragndrop'], fileName)) {
      source = fileName;
      fileName = null;
    }
    if (base64) {
      AppActions.addFileForUploadWithBase64(base64, fileName, source);
    }
  }

  /**
   * Trigger a file uploader error message
   *
   * @method showFileUploadError
   * @param {string} [file_name] - UI will show blank if not provided
   * @param {string} key - one of the HC.api.FileUploaderErrors enums
   * @static
   */
  showFileUploadError(file_name, key) {
    let jid = AppStore.get('active_chat');
    ChatInputActions.expandAttachment({ jid, file_name });
    FileUploaderActions.dispatchFileError({ jid, key });
  }

  /**
   * Open the file chooser dialog
   *
   * @method openFilePicker
   * @static
   */
  openFilePicker() {
    FileUploaderActions.openFilePicker();
  }

  /**
   * Clear active web cookies
   *
   * @param cb callback to be executed on success or failure
   *
   * @method clearWebCookies
   */
  clearWebCookies(cb = _.noop) {
    AppActions.clearWebCookies(cb);
  }

  /**
   * Revoke Oauth2 token
   *
   * @param cb callback to be executed on success or failure
   *
   * @method revokeOauth2Token
   */
  revokeOauth2Token(cb = _.noop) {
    AppActions.revokeOauth2Token(cb);
  }

  /**
   * Sanitize Sentry errors
   *
   * @param data Sentry error objects
   * @returns {Object} sanitized error object for Sentry
   *
   * @method sanitizeError
   */
  sanitizeError(data) {
    if (data) {
      return sentryHelper.sanitize(data);
    }
  }

  /**
   * Toggles the left sidebar
   *
   * @method toggleLeftSidebar
   * @static
   */
  toggleLeftSidebar() {
    var toggle = !PreferencesStore.shouldShowNavigationSidebar();
    LayoutActions.setLeftSidebarVisibility(toggle);
  }

  /**
   * Toggles the right sidebar for the active chat type
   *
   * @method toggleRightSidebar
   * @static
   */
  toggleRightSidebar() {
    var active_chat = AppStore.get("active_chat"),
        chat_type = utils.room.detect_chat_type(active_chat),
        visibility = false;

    if (chat_type === "chat") {
      visibility = !PreferencesStore.shouldShowChatSidebar();
      LayoutActions.setRightChatSidebarVisibility(visibility);
    } else if (chat_type === "groupchat") {
      visibility = !PreferencesStore.shouldShowGroupChatSidebar();
      LayoutActions.setRightGroupChatSidebarVisibility(visibility);
    }
  }

  /**
   * Gets the temporary signed url and download url for the specified file
   * @param fileUrl
   */
  getFileUrls(fileUrl) {
    return new Promise((resolve, reject) => {
      let fetchSignedFile = (url) => {
        AppDispatcher.dispatch('API:fetch-signed-file', {
          url: url
        }, resp => {
          if (resp instanceof DALError) {
            reject(resp);
          } else {
            resolve({
              url: url,
              signedUrl: resp.temp_url,
              downloadUrl: resp.temp_download_url
            });
          }
        });
      };

      if (RosterStore.isSignedFile(fileUrl)) {
        let url = fileUrl;
        if (!RosterStore.isFileUrlAuthenticated(url)) {
          url = RosterStore.getPublicUrlFromThumbnail(url);
        }

        fetchSignedFile(url);
      } else {
        resolve({
          url: fileUrl,
          signedUrl: fileUrl,
          downloadUrl: fileUrl
        });
      }
    });
  }

  /**
   * Lets the app know that the user is on a call
   */
  onVideoConferenceJoined() {
    AppDispatcher.dispatch('enso.video-conference-joined');
  }

  /**
   * Lets the app know that the user has left the call
   */
  onVideoConferenceLeft() {
    AppDispatcher.dispatch('enso.video-conference-left');
  }

  startVideoCall() {
    let jid = AppStore.get('active_chat');

    if (!_isVideoEnabled(jid)) {
      return;
    }

    let chat = AppStore.get('activeRooms')[jid];
    let enso_enabled = ChatHeaderStore.get('web_client_enso_video_enabled');
    let data = {
      jid,
      name: chat.name,
      service: enso_enabled ? VideoServiceKeys.ENSO : VideoServiceKeys.ADDLIVE
    };

    if (utils.jid.is_room(jid)) {
      data.room_id = chat.id;
      ChatHeaderActions.startEnsoRoomVideo(data);
    } else {
      data.audio_only = false;
      ChatHeaderActions.startCall(data);
    }
  }

  isVideoEnabled() {
    let jid = AppStore.get('active_chat');
    return _isVideoEnabled(jid);
  }

  isFileSharingEnabled() {
    let jid = AppStore.get('active_chat');

    if (!utils.jid.is_chat(jid)) {
      return false;
    }

    return ChatInputStore.get('can_share_files');
  }

  /**
   * Lets the app know that the user  is on addlive call
   */
  onAddLiveCall() {
    CurrentUserActions.onCall();
  }

  /**
   * Scrolls down in chat on zoom
   */
  scrollDownOnZoom() {
    AppDispatcher.dispatch('scroll-down-on-zoom');
  }
 }

export default new API();



/** WEBPACK FOOTER **
 ** ./src/js/app/api/api.js
 **/