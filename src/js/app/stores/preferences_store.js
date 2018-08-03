import utils from 'helpers/utils';
import ModelStore from 'lib/core/model_store';
import * as Constants from 'core/common/constants';
import DALCache from 'core/dal.cache';
import AppDispatcher from 'dispatchers/app_dispatcher';
import PreferencesKeys from 'keys/preferences_keys';
import PreferencesModel from 'models/preferences_model';
import ClientPreferencesKeys from 'keys/client_preferences_keys';
import AppConfig from 'config/app_config';
import IntegrationHelper from 'helpers/integration_helper.js';
import ConfigStore from 'stores/configuration_store';


let SERVER_KEYS, CLIENT_KEYS;

class PreferencesStore extends ModelStore {

  /**
   * On construction of the store, pull in any saved localStorage preferences
   */
  constructor() {
    super();
    this._initKeys();
    this._throttledSavePrefs = _.throttle(this.savePrefs, AppConfig.save_preferences_throttle_interval, {leading: true, trailing: true});
    this.local = {
      queued: {},
      cache_configured: false
    };
  }

  _initKeys() {
    SERVER_KEYS = _.invert(PreferencesKeys);
    CLIENT_KEYS = _.invert(ClientPreferencesKeys);
    CLIENT_KEYS = _.assign(CLIENT_KEYS, SERVER_KEYS);

    // HW-1127 To prevent messing up order in OTO chats
    CLIENT_KEYS = _.omit(CLIENT_KEYS, [PreferencesKeys.AUTO_JOIN]);
  }

  getModel() {
    return PreferencesModel;
  }

  flush() {
    if (this.local.cache_configured) {
      DALCache.set(DALCache.Keys.CLIENT_PREFERENCES, this.getClientPreferences());
    }
  }

  getServerPreferences(from = this.getAll()) {
    return _.pickBy(from, (val, key) => _.has(SERVER_KEYS, key));
  }

  getClientPreferences(from = this.getAll()) {
    return _.pickBy(from, (val, key) => _.has(CLIENT_KEYS, key));
  }

  getDefaults() {
    return {
      [PreferencesKeys.NOTIFY_WHEN_DND]: false,
      [PreferencesKeys.NOTIFY_FOR_VIDEO_WHEN_DND]: false,
      [PreferencesKeys.THEME]: AppConfig.default_theme,
      [PreferencesKeys.DENSITY]: AppConfig.default_density,
      [PreferencesKeys.CHAT_VIEW]: AppConfig.default_chat_view,
      [PreferencesKeys.NAME_DISPLAY]: AppConfig.default_name_display,
      [PreferencesKeys.ENABLE_IDLE]: true,
      [PreferencesKeys.IDLE_MINUTES]: Constants.IDLE_DELAY_MINUTES,
      [PreferencesKeys.NOTIFY_FOR_ROOM]: true,
      [PreferencesKeys.NOTIFY_FOR_TAG]: true,
      [PreferencesKeys.NOTIFY_FOR_PRIVATE_ROOM]: true,
      [PreferencesKeys.NOTIFY_FOR_PRIVATE]: true,
      [PreferencesKeys.HIDE_PRESENCE_MESSAGES]: true,
      [PreferencesKeys.SOUNDS_ENABLED]: true,
      [PreferencesKeys.MESSAGE_SOUNDS]: true,
      [PreferencesKeys.VIDEO_SOUNDS]: true,
      [PreferencesKeys.GLOBAL_NOTIFICATION_SETTING]: 'loud',
      [PreferencesKeys.IGNORE_ADD_INTEGRATIONS_GLANCE]: '',
      [ClientPreferencesKeys.ANIMATED_AVATARS]: AppConfig.default_animated_avatars,
      [ClientPreferencesKeys.HIDE_GIFS_BY_DEFAULT]: false,
      [ClientPreferencesKeys.ENABLE_SPELL_CHECK]: true,
      [ClientPreferencesKeys.ENABLE_AUTOCORRECT]: false,
      [ClientPreferencesKeys.HIDE_ATTACHED_CARDS_BY_DEFAULT]: false,
      [ClientPreferencesKeys.REPLACE_TEXT_EMOTICONS]: true,
      [ClientPreferencesKeys.SHOW_UNREAD_DIVIDER]: true,
      [ClientPreferencesKeys.SHOW_CHAT_SIDEBAR]: true,
      [ClientPreferencesKeys.SHOW_GROUPCHAT_SIDEBAR]: true,
      [ClientPreferencesKeys.SHOW_NAVIGATION_SIDEBAR]: true,
      [ClientPreferencesKeys.CHAT_ACTIVE_PANEL]: 'files',
      [ClientPreferencesKeys.GROUPCHAT_ACTIVE_PANEL]: 'roster',
      [ClientPreferencesKeys.LEFT_COLUMN_WIDTH]: AppConfig.column_width_limits['left'].default,
      [ClientPreferencesKeys.RIGHT_COLUMN_WIDTH]: AppConfig.column_width_limits['right'].default,
      [ClientPreferencesKeys.KEEP_POPUPS_VISIBLE]: false,
      [ClientPreferencesKeys.BLINK_TASKBAR]: true,
      [ClientPreferencesKeys.BOUNCE_ICON]: true,
      [ClientPreferencesKeys.BOUNCE_ONCE]: true,
      [ClientPreferencesKeys.ENABLE_LOGGING]: false,
      [ClientPreferencesKeys.SHOW_QUICK_SWITCHER_HINT]: true,
      [ClientPreferencesKeys.ACTIVE_CHAT_INTEGRATION]: null,
      [ClientPreferencesKeys.ACTIVE_GROUPCHAT_INTEGRATION]: null
    };
  }

  /**
   * This function ensures that we have valid values for our settings (especially in the scenario of a new user).
   * The validity of these values is important when determining the default value of globalNotificationSetting.
   *
   * @param config the configuration object that we get when HC has initialized
   */
  getValidDefaults(config) {
    var serverSettings = _.pickBy(config.preferences, (x) => !_.isNull(x) && !_.isUndefined(x) && x !== ''),
        overrides = {
          [PreferencesKeys.NOTIFY_FOR_ROOM]: _.get(serverSettings, PreferencesKeys.NOTIFY_FOR_ROOM, true),
          [PreferencesKeys.NOTIFY_FOR_PRIVATE_ROOM]: _.get(serverSettings, PreferencesKeys.NOTIFY_FOR_PRIVATE_ROOM, true)
        };

    // if they don't have a default for the global notification setting, set it based on the room settings above
    if(_.get(config, "feature_flags.web_client_per_room_notifications")) {
      let globalDefault = (overrides[PreferencesKeys.NOTIFY_FOR_ROOM] || overrides[PreferencesKeys.NOTIFY_FOR_PRIVATE_ROOM]) ? "loud" : "normal";
      overrides[PreferencesKeys.GLOBAL_NOTIFICATION_SETTING] = _.get(serverSettings, PreferencesKeys.GLOBAL_NOTIFICATION_SETTING, globalDefault);
    }

    return _.extend(this.getAll(), serverSettings, overrides);
  }

  getNotificationTypes() {
    return {
      [PreferencesKeys.SHOW_TOASTERS]: this.getShowToasters(),
      [ClientPreferencesKeys.BLINK_TASKBAR]: this.shouldBlinkTaskBar(),
      [ClientPreferencesKeys.BOUNCE_ICON]: this.shouldBounceIcon(),
      [ClientPreferencesKeys.BOUNCE_ONCE]: this.shouldBounceOnce()
    };
  }

  registerListeners() {
    AppDispatcher.registerOnce({
      'DAL:cache-configured': () => {
        this.local.cache_configured = true;
        DALCache.get(DALCache.Keys.CLIENT_PREFERENCES).then((prefs) => {
          this.set(prefs);
        });
      }
    });
    AppDispatcher.register({
      'updated:active_chat': (jid) => {
        this.setChatToFocus(jid);
      },
      'updated:config': (config) => {
        if (_.has(config, 'preferences')) {
          if (_.has(config, 'preferences.properties') && !_.isObject(config.preferences.properties)){
            delete config.preferences.properties;
          }
          this.setIfNotEqual(_.omitBy(config.preferences, _.isUndefined));
        }
        if (_.has(config, 'feature_flags')) {
          this.set({
            web_client_integrations_enabled: IntegrationHelper.isFeatureEnabled(config),
            web_client_freeze_gifs: _.get(config, 'feature_flags.web_client_freeze_gifs', false)
          });
        }
      },
      'updated:ignoreAddIntegrationsGlance': (roomIdArray) => {
        this.set(PreferencesKeys.IGNORE_ADD_INTEGRATIONS_GLANCE, roomIdArray);
      },
      'save-preferences': (prefs) => {
        this.setIfNotEqual(prefs);
      },
      'add-room-integration-discovery-ignore-list': (roomId) => {
        this.addRoomToIgnoreIntegrationGlanceList(roomId);
      },
      'close-room': (data) => {
        this.removeRoom(data);
      },
      'toggle-sound-notifications': () => {
        this.toggleSounds();
      },
      'set-first-login-date': () => {
        this.setFirstLoginDate();
      },
      'unload-app': () => {
        this.savePrefs();
      }
    });

    this.on('change', this._onChange);
  }

  _onChange(changeset) {
    let serverChanges = this.getServerPreferences(changeset);
    let clientChanges = this.getClientPreferences(changeset);
    if (!_.isEmpty(clientChanges)) {
      this.flush();
    }
    if (!_.isEmpty(serverChanges)) {
      _.assign(this.local.queued, serverChanges);
      this._throttledSavePrefs();
    }
    AppDispatcher.dispatch('updated:preferences', this.getAll());
  }

  savePrefs() {
    AppDispatcher.dispatch('sync-preferences', this.local.queued);
    this.local.queued = {};
  }

  getAutoJoinRooms() {
    return this.get(PreferencesKeys.AUTO_JOIN);
  }

  setAutoJoinRooms(autoJoinRooms){
    this.set({
      [PreferencesKeys.AUTO_JOIN]: autoJoinRooms
    });
  }

  getChatToFocus() {
    return this.get(ClientPreferencesKeys.CHAT_TO_FOCUS);
  }

  getSoundsEnabled() {
    return this.get(PreferencesKeys.SOUNDS_ENABLED);
  }

  getMessageSounds() {
    return this.get(PreferencesKeys.MESSAGE_SOUNDS);
  }

  getVideoSounds() {
    return this.get(PreferencesKeys.VIDEO_SOUNDS);
  }

  getShowToasters() {
    return this.get(PreferencesKeys.SHOW_TOASTERS);
  }

  getBlinkTaskBar() {
    return this.get(ClientPreferencesKeys.BLINK_TASKBAR);
  }

  getBounceIcon() {
    return this.get(ClientPreferencesKeys.BOUNCE_ICON);
  }

  getBounceOnce() {
    return this.get(ClientPreferencesKeys.BOUNCE_ONCE);
  }

  toggleSounds() {
    this.set(PreferencesKeys.SOUNDS_ENABLED, !this.getSoundsEnabled());
  }

  getHidePresenceMessages() {
    return this.get(PreferencesKeys.HIDE_PRESENCE_MESSAGES);
  }

  shouldUse24HrTime() {
    return this.get(PreferencesKeys.USE_24_HR_FORMAT) || false;
  }

  /**
   * Check if the notification should be shown
   */
  shouldIssueNotification() {
    return this.getShowToasters() ||
      this.shouldBlinkTaskBar() ||
      this.shouldBounceIcon();
  }

  setChatToFocus(jid) {
    if (!utils.jid.is_search(jid)) {
      this.data.chatToFocus = jid ? jid.replace(/"/g,'') : '';
      this._onChange({[ClientPreferencesKeys.CHAT_TO_FOCUS]: this.data.chatToFocus});
    }
  }

  removeRoom(data) {
    var autoJoinRooms = _.filter(this.getAutoJoinRooms(), (room) => {
      return room.jid !== data.jid;
    });
    this.set({
      [PreferencesKeys.AUTO_JOIN]: autoJoinRooms
    });
  }

  setFirstLoginDate() {
    var properties = this.get(PreferencesKeys.PROPERTIES) || {};
    properties[PreferencesKeys.PROPERTIES_FIRST_LOGIN_DATE] = new Date().getTime();
    this.set(PreferencesKeys.PROPERTIES, properties);
  }

  getRoomNotificationOverrides() {
    var overrides = this.get(PreferencesKeys.ROOM_NOTIFICATION_OVERRIDES);
    return (_.isEmpty(overrides)) ? {} : overrides;
  }

  overrideNotificationForRoom(room_jid, override_info) {
    var overrides = _.cloneDeep(this.getRoomNotificationOverrides());
    overrides[room_jid] = override_info;
    this.set(PreferencesKeys.ROOM_NOTIFICATION_OVERRIDES, overrides);
  }

  removeRoomNotificationOverride(room_jid) {
    var overrides = _.omit(this.getRoomNotificationOverrides(), room_jid);
    this.set(PreferencesKeys.ROOM_NOTIFICATION_OVERRIDES, overrides);
  }

  getGlobalNotificationSetting() {
    return this.get(PreferencesKeys.GLOBAL_NOTIFICATION_SETTING);
  }

  setGlobalNotificationSetting(level) {
    this.set(PreferencesKeys.GLOBAL_NOTIFICATION_SETTING, level);
  }

  getNotifyWhenDND() {
    return this.get(PreferencesKeys.NOTIFY_WHEN_DND);
  }

  getNotifyForVideoWhenDND() {
    return this.get(PreferencesKeys.NOTIFY_FOR_VIDEO_WHEN_DND);
  }

  shouldHideGifsByDefault() {
    return this.get(ClientPreferencesKeys.HIDE_GIFS_BY_DEFAULT);
  }

  shouldHideAttachedCardsByDefault() {
    return this.get(ClientPreferencesKeys.HIDE_ATTACHED_CARDS_BY_DEFAULT);
  }

  shouldReplaceTextEmoticons() {
    return this.get(ClientPreferencesKeys.REPLACE_TEXT_EMOTICONS);
  }

  shouldShowUnreadMessageDivider() {
    return this.get(ClientPreferencesKeys.SHOW_UNREAD_DIVIDER);
  }

  shouldShowChatSidebar() {
    return this.get(ClientPreferencesKeys.SHOW_CHAT_SIDEBAR);
  }

  shouldShowGroupChatSidebar() {
    return this.get(ClientPreferencesKeys.SHOW_GROUPCHAT_SIDEBAR);
  }

  shouldShowNavigationSidebar() {
    return this.get(ClientPreferencesKeys.SHOW_NAVIGATION_SIDEBAR);
  }

  getChatActivePanel() {
    let chatActivePanel = this.get(ClientPreferencesKeys.CHAT_ACTIVE_PANEL);
    if (this.get('web_client_integrations_enabled')) {
      return 'integrations';
    } else if (chatActivePanel === 'integrations') {
      return 'files';
    }
    return chatActivePanel;
  }

  getGroupChatActivePanel() {
    let activeGroupChatPanel = this.get(ClientPreferencesKeys.GROUPCHAT_ACTIVE_PANEL);
    if (this.get('web_client_integrations_enabled')) {
      return 'integrations';
    } else if (activeGroupChatPanel === 'integrations') {
      return 'roster';
    }
    return activeGroupChatPanel;
  }

  getActiveGroupchatIntegration() {
    return this.get(ClientPreferencesKeys.ACTIVE_GROUPCHAT_INTEGRATION);
  }

  getActiveChatIntegration() {
    return this.get(ClientPreferencesKeys.ACTIVE_CHAT_INTEGRATION);
  }

  getLeftColumnWidth() {
    return this.get(ClientPreferencesKeys.LEFT_COLUMN_WIDTH);
  }

  getRightColumnWidth() {
    return this.get(ClientPreferencesKeys.RIGHT_COLUMN_WIDTH);
  }

  getChatView() {
    return this.get(PreferencesKeys.CHAT_VIEW);
  }

  getNameDisplay() {
    return this.get(PreferencesKeys.NAME_DISPLAY);
  }

  getShowQuickSwitcherHint() {
    return this.get(ClientPreferencesKeys.SHOW_QUICK_SWITCHER_HINT);
  }

  getNameDisplayOptions() {
    return [
      'names',
      'mentions'
    ];
  }

  getIgnoreAddIntegrationGlanceRooms() {
    return this._convertStringToIntArray(this.get(PreferencesKeys.IGNORE_ADD_INTEGRATIONS_GLANCE));
  }

  _convertStringToIntArray(string) {
    var intArray = [];
    if (string) {
      intArray = string.split(',').map(Number);
    }
    return intArray;
  }

  addRoomToIgnoreIntegrationGlanceList(roomId) {
    var roomsThatDismissedIntegrationsGlance = this._convertStringToIntArray(this.get(PreferencesKeys.IGNORE_ADD_INTEGRATIONS_GLANCE));
    if (!_.includes(roomsThatDismissedIntegrationsGlance, roomId)) {
      roomsThatDismissedIntegrationsGlance.push(roomId);
      this.set(PreferencesKeys.IGNORE_ADD_INTEGRATIONS_GLANCE, roomsThatDismissedIntegrationsGlance.join());
    }
    AppDispatcher.dispatch('save-preferences', {
      [PreferencesKeys.IGNORE_ADD_INTEGRATIONS_GLANCE]: roomsThatDismissedIntegrationsGlance.join()
    });
  }

  getTheme() {
    return this.get(PreferencesKeys.THEME);
  }

  isDarkTheme(){
    return this.getTheme() === this.DARK_THEME;
  }

  get LIGHT_THEME (){
    return 'light';
  }

  get DARK_THEME (){
    return 'dark';
  }

  getThemeOptions() {
    return [
      this.LIGHT_THEME,
      this.DARK_THEME
    ];
  }

  getChatViewOptions() {
    return [
      'classic_neue',
      'classic'
    ];
  }

  getDensity() {
    return this.get(PreferencesKeys.DENSITY);
  }

  getDensityOptions() {
    return [
      'normal',
      'tighter'
    ];
  }

  getAnimatedAvatarsOptions() {
    return [
      'animated',
      'static'
    ];
  }

  shouldAnimateAvatars() {
    return !this.data.web_client_freeze_gifs || this.get(ClientPreferencesKeys.ANIMATED_AVATARS) === 'animated';
  }

  shouldLog() {
    return this.get(ClientPreferencesKeys.ENABLE_LOGGING);
  }

  shouldBlinkTaskBar() {
    let subtype = ConfigStore.get('client_subtype'),
      isValidSubType = utils.clientSubType.isWindows(subtype);

    return isValidSubType && this.getBlinkTaskBar();
  }

  shouldBounceIcon() {
    let subtype = ConfigStore.get('client_subtype'),
      isValidSubType = utils.clientSubType.isMac(subtype);

    return isValidSubType && this.getBounceIcon();
  }

  shouldBounceOnce() {
    let subtype = ConfigStore.get('client_subtype'),
      isValidSubType = utils.clientSubType.isMac(subtype);

    return isValidSubType && this.getBounceOnce();
  }
}

export default new PreferencesStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/preferences_store.js
 **/