/**
 * @typedef {{name: string, key: string}} prefs
 * @type {Object.<string, string>}
 */
const PrefKeys = Object.freeze({
  NOTIFY_FOR_ROOM: "notifyForRoom",
  NOTIFY_FOR_PRIVATE_ROOM: "notifyForPrivateRoom",
  NOTIFY_FOR_TAG: "notifyForTag",
  NOTIFY_FOR_PRIVATE: "notifyForPrivate",
  NOTIFY_WHEN_DND: "notifyWhenDND",
  NOTIFY_FOR_VIDEO_WHEN_DND: "notifyForVideoWhenDND",
  SOUNDS_ENABLED: "soundsEnabled",
  MESSAGE_SOUNDS: "messageSounds",
  VIDEO_SOUNDS: "videoSounds",
  SHOW_TOASTERS: "showToasters",
  HIDE_PRESENCE_MESSAGES: "hidePresenceMessages",
  USE_24_HR_FORMAT: "timeFormat24Hour",
  PROPERTIES: "properties",
  PROPERTIES_FIRST_LOGIN_DATE: "firstLoginDate",
  ROOM_NOTIFICATION_OVERRIDES: "roomNotificationOverrides",
  GLOBAL_NOTIFICATION_SETTING: "globalNotificationSetting",
  AUTO_JOIN: "autoJoin",
  NOTIFICATIONS: 'notifications',
  UPDATE_TIME: 'updateTime',
  THEME: "theme",
  DENSITY: "density",
  CHAT_VIEW: 'chatView',
  NAME_DISPLAY: 'nameDisplay',
  ENABLE_IDLE: 'enableIdle',
  IDLE_MINUTES: 'idleMinutes',
  CHECK_MINOR_UPDATES: 'checkMinorUpdates',
  IGNORE_ADD_INTEGRATIONS_GLANCE: 'ignoreAddIntegrationsGlance'
});

export default PrefKeys;


/** WEBPACK FOOTER **
 ** ./src/js/app/keys/preferences_keys.js
 **/