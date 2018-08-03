/**
 * @typedef {{name: string, key: string}} clientPrefs
 * @type {Object.<string, string>}
 */
const ClientPrefKeys = Object.freeze({
  ANIMATED_AVATARS: 'animatedAvatars',
  HIDE_GIFS_BY_DEFAULT: 'hideGifsByDefault',
  HIDE_ATTACHED_CARDS_BY_DEFAULT: 'hideAttachedCardsByDefault',
  CHAT_TO_FOCUS: 'chatToFocus',
  REPLACE_TEXT_EMOTICONS: 'replaceTextEmoticons',
  SHOW_UNREAD_DIVIDER: 'showUnreadDivider',
  SHOW_CHAT_SIDEBAR: 'showChatSidebar',
  SHOW_GROUPCHAT_SIDEBAR: 'showGroupChatSidebar',
  SHOW_NAVIGATION_SIDEBAR: 'showNavigationSidebar',
  CHAT_ACTIVE_PANEL: 'chatActivePanel',
  GROUPCHAT_ACTIVE_PANEL: 'groupChatActivePanel',
  LEFT_COLUMN_WIDTH: 'leftColumnWidth',
  RIGHT_COLUMN_WIDTH: 'rightColumnWidth',
  LAUNCH_WITH_OS_STARTUP: 'launchWithOSStartup',
  ENABLE_SPELL_CHECK: 'enableSpellCheck',
  ENABLE_AUTOCORRECT: 'enableAutoCorrect',
  KEEP_POPUPS_VISIBLE: 'keepPopUsVisible',
  BLINK_TASKBAR: 'blinkTaskbar',
  BOUNCE_ICON: 'bounceIcon',
  BOUNCE_ONCE: 'bounceOnce',
  ENABLE_LOGGING: 'enableLogging',
  SHOW_QUICK_SWITCHER_HINT: 'showQuickSwitcherHint',
  ACTIVE_GROUPCHAT_INTEGRATION: 'activeGroupchatIntegration',
  ACTIVE_CHAT_INTEGRATION: 'activeChatIntegration'
});

export default ClientPrefKeys;



/** WEBPACK FOOTER **
 ** ./src/js/app/keys/client_preferences_keys.js
 **/