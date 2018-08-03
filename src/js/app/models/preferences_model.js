import utils from 'helpers/utils';
import AppConfig from 'config/app_config';
import PreferencesKeys from 'keys/preferences_keys';
import ClientPreferencesKeys from 'keys/client_preferences_keys';

/**
 * @class PreferencesModel
 *
 * Application State:
 *
 * @property {array} autoJoin
 * @property {string} chatToFocus
 *
 * User State:
 *
 * @property {object} properties
 * @property {number} properties.firstLoginDate
 * @property {array} ignoreAddIntegrationsGlance
 *
 * Appearance Settings:
 *
 * @property {string} theme "light|dark"
 * @property {string} density "normal|tighter"
 * @property {string} chatView "classic|classic_neue"
 * @property {string} nameDisplay "names|mentions"
 * @property {string} animatedAvatars "animated|static"
 * @property {boolean} timeFormat24Hour
 * @property {boolean} showUnreadDivider
 * @property {boolean} hidePresenceMessages
 * @property {boolean} bounceIcon // Mac
 *
 * Notification Settings:
 *
 * @property {string} globalNotificationSetting "loud|quiet|normal"
 * @property {boolean} notifyForRoom
 * @property {boolean} notifyForPrivateRoom
 * @property {boolean} notifyForTag
 * @property {boolean} notifyForPrivate
 * @property {boolean} notifyWhenDND
 * @property {boolean} notifyForVideoWhenDND
 * @property {boolean} showToasters
 * @property {boolean} soundsEnabled
 * @property {boolean} messageSounds
 * @property {boolean} videoSounds
 * @property {boolean} blinkTaskbar // Windows
 *
 * @property {object} notifications
 * @property {array} notifications.room_invite
 * @property {array} notifications.oto_call
 * @property {array} notifications.group_invite_requested
 * @property {array} notifications.oto_message
 * @property {array} notifications.mention
 * @property {array} notifications.newsletter
 *
 * @property {object} roomNotificationOverrides
 * @property {object} roomNotificationOverrides[room_jid]
 * @property {string} roomNotificationOverrides[room_jid].level "quiet|loud|normal"
 *
 * Native Prefs, unused in web client:
 *
 * @property {boolean} enableIdle
 * @property {number} idleMinutes
 * @property {number} updateTime
 * @property {boolean} checkMinorUpdates
 * @property {boolean} keepPopUsVisible
 * @property {boolean} blinkTaskbar
 *
 * Client Preferences (persisted in localStorage):
 *
 * @property {boolean} hideGifsByDefault
 * @property {boolean} replaceTextEmoticons
 * @property {boolean} showUnreadDivider
 * @property {boolean} showChatSidebar
 * @property {boolean} showGroupChatSidebar
 * @property {boolean} showNavigationSidebar
 * @property {boolean} launchWithOSStartup
 * @property {boolean} enableSpellCheck
 * @property {boolean} bounceIcon
 * @property {boolean} enableLogging
 * @property {boolean} showQuickSwitcherHint
 * @property {string} chatActivePanel
 * @property {string} groupChatActivePanel
 * @property {number} leftColumnWidth
 * @property {number} rightColumnWidth
 * @property {object} activeGroupchatIntegration
 * @property {object} activeChatIntegration
 */

const ENUMS = {
  theme: {
    options: [ 'light', 'dark' ],
    default: AppConfig.default_theme
  },
  density: {
    options: [ 'normal', 'tighter' ],
    default: AppConfig.default_density
  },
  chatView: {
    options: [ 'classic', 'classic_neue' ],
    default: AppConfig.default_chat_view
  },
  nameDisplay: {
    options: [ 'names', 'mentions' ],
    default: AppConfig.default_name_display
  },
  animatedAvatars: {
    options: [ 'animated', 'static' ],
    default: AppConfig.default_animated_avatars
  },
  notificationLevels: {
    options: [ 'loud', 'normal', 'quiet' ],
    default: AppConfig.default_notification_level
  }
};

// Various string prefs sometimes come back with extraneous quotes around them
function normalizeString(val) {
  return _.isString(val) ? val.replace(/"/g, '') : val;
}

// Make sure appearance setting values are ONLY the expected enums above
function normalizeAppearanceSettings(key, val) {
  let str = normalizeString(val);
  if (!_.includes(ENUMS[key].options, str)) {
    return ENUMS[key].default;
  }
  return str;
}

// Ensure global notification setting is one of the expected enums above
function normalizeGlobalNotificationSetting(val, obj) {
  if (_.isString(val)) {
    let str = normalizeString(val);
    if (_.includes(ENUMS.notificationLevels.options, str)) {
      return str;
    }
  }
  return (obj[PreferencesKeys.NOTIFY_FOR_ROOM] || obj[PreferencesKeys.NOTIFY_FOR_PRIVATE_ROOM]) ? 'loud' : 'normal';
}

// Clean up autojoin -- mainly from raw x2js input
function normalizeAutoJoin(autoJoin) {
  let normalizedAutoJoin = [];

  if (autoJoin.item) {
    autoJoin = autoJoin.item;
  }
  if (!Array.isArray(autoJoin)) {
    autoJoin = [ autoJoin ];
  }

  for (let room in autoJoin) {
    let curRoom = autoJoin[room];
    if (_.isPlainObject(curRoom) && !_.isEmpty(curRoom)) {
      normalizedAutoJoin.push(_.pick(curRoom, 'jid', 'name'));
    }
  }
  return normalizedAutoJoin;
}

// Returned as object with comma separated string values instead of array of values
function normalizeNotifications(notifications) {
  return _.transform(notifications, (result, val, key) => {
    if (_.isString(val)) {
      result[key] = _.compact(val.split(','));
    } else {
      result[key] = val;
    }
  });
}

// roomNotificationOverrides is sometimes an object,
// sometimes a json string, sometimes an empty string
function normalizeJSON(json) {
  if (_.isObject(json)) {
    return json;
  } else if (_.isString(json)) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }
}

// The Big Switch. Go through each key and fix/properly coerce the value
function normalizePreferences (input) {
  return _.transform(input, (result, val, key, original) => {
    switch (key) {

      case PreferencesKeys.USE_24_HR_FORMAT:
      case PreferencesKeys.HIDE_PRESENCE_MESSAGES:
      case PreferencesKeys.NOTIFY_FOR_TAG:
      case PreferencesKeys.NOTIFY_FOR_PRIVATE:
      case PreferencesKeys.NOTIFY_WHEN_DND:
      case PreferencesKeys.NOTIFY_FOR_VIDEO_WHEN_DND:
      case PreferencesKeys.SHOW_TOASTERS:
      case PreferencesKeys.SOUNDS_ENABLED:
      case PreferencesKeys.MESSAGE_SOUNDS:
      case PreferencesKeys.VIDEO_SOUNDS:
      case PreferencesKeys.ENABLE_IDLE:
      case PreferencesKeys.CHECK_MINOR_UPDATES:
      case ClientPreferencesKeys.SHOW_UNREAD_DIVIDER:
      case ClientPreferencesKeys.REPLACE_TEXT_EMOTICONS:
      case ClientPreferencesKeys.BOUNCE_ICON:
      case ClientPreferencesKeys.BOUNCE_ONCE:
      case ClientPreferencesKeys.BLINK_TASKBAR:
      case ClientPreferencesKeys.HIDE_GIFS_BY_DEFAULT:
      case ClientPreferencesKeys.SHOW_CHAT_SIDEBAR:
      case ClientPreferencesKeys.SHOW_GROUPCHAT_SIDEBAR:
      case ClientPreferencesKeys.SHOW_NAVIGATION_SIDEBAR:
      case ClientPreferencesKeys.LAUNCH_WITH_OS_STARTUP:
      case ClientPreferencesKeys.ENABLE_SPELL_CHECK:
      case ClientPreferencesKeys.KEEP_POPUPS_VISIBLE:
      case ClientPreferencesKeys.ENABLE_LOGGING:
      case ClientPreferencesKeys.SHOW_QUICK_SWITCHER_HINT:
        result[key] = utils.coerceBoolean(val);
        break;

      case PreferencesKeys.NOTIFY_FOR_ROOM:
      case PreferencesKeys.NOTIFY_FOR_PRIVATE_ROOM:
        result[key] = _.isBoolean(val) ? val : true;
        break;

      case PreferencesKeys.IDLE_MINUTES:
      case PreferencesKeys.UPDATE_TIME:
      case ClientPreferencesKeys.LEFT_COLUMN_WIDTH:
      case ClientPreferencesKeys.RIGHT_COLUMN_WIDTH:
        result[key] = parseFloat(val);
        break;

      case PreferencesKeys.CHAT_TO_FOCUS:
      case ClientPreferencesKeys.CHAT_ACTIVE_PANEL:
      case ClientPreferencesKeys.GROUPCHAT_ACTIVE_PANEL:
      case PreferencesKeys.IGNORE_ADD_INTEGRATIONS_GLANCE:
        result[key] = normalizeString(val);
        break;

      case PreferencesKeys.GLOBAL_NOTIFICATION_SETTING:
        result[key] = normalizeGlobalNotificationSetting(val, original);
        break;

      case PreferencesKeys.THEME:
      case PreferencesKeys.CHAT_VIEW:
      case PreferencesKeys.DENSITY:
      case PreferencesKeys.NAME_DISPLAY:
      case ClientPreferencesKeys.ANIMATED_AVATARS:
        result[key] = normalizeAppearanceSettings(key, val);
        break;

      case PreferencesKeys.AUTO_JOIN:
        result[key] = normalizeAutoJoin(val);
        break;

      case PreferencesKeys.NOTIFICATIONS:
        result[key] = normalizeNotifications(val);
        break;

      case PreferencesKeys.PROPERTIES:
        result[key] = normalizeJSON(val);
        break;

      case PreferencesKeys.ROOM_NOTIFICATION_OVERRIDES:
        result[key] = normalizeJSON(val);
        break;

      // ignored keys
      case 'secondsToIdle':
      case 'isIdleTimeEnabled':
      case 'enableEmoticons':
      case 'dndWhenInCall':
      case 'visualNotifications':
      case 'exitWarn':
        break;

      default:
        result[key] = val;
    }
  });
}

export default class PreferencesModel {

  /**
   * @constructs
   *
   * @param {object} input
   * @param {boolean} [serverPreferencesOnly]
   */
  constructor(input = Object.create(null), serverPreferencesOnly = false) {
    if (serverPreferencesOnly) {
      input = _.pick(input, _.values(PreferencesKeys));
    }
    Object.assign(this, normalizePreferences(input));
  }
}



/** WEBPACK FOOTER **
 ** ./src/js/app/models/preferences_model.js
 **/