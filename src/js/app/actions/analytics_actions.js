import AnalyticsDispatcher from "dispatchers/analytics_dispatcher";
import AnalyticsKeys from 'keys/analytics_keys';
import utils from 'helpers/utils';

export default {

  successfulAuthEvent (jid, token){
    AnalyticsDispatcher.dispatch("analytics-initial-auth-done", {jid: jid, token: token});
  },

  inviteTeamClickedEvent(source) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: `hipchat.client.${source}.invite.team.clicked`
    });
  },

  inviteUserToRoomClickedEvent(source) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: `hipchat.client.${source}.invite.user.to.room.clicked`
    });
  },

  createRoomClickedEvent(source) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: `hipchat.client.${source}.create.room.clicked`
    });
  },

  connectDialogLinkClickedEvent(addon_key) {
    AnalyticsDispatcher.dispatch('analytics-connect-dialog-click', {addon_key: addon_key});
  },

  connectDialogClosedEvent(addon_key) {
    AnalyticsDispatcher.dispatch('analytics-connect-dialog-close', {addon_key: addon_key});
  },

  newChatButtonClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.top.new.chat.button.clicked'
    });
  },

  failedMessageRetried() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.queued.retry'
    });
  },

  failedMessageCanceled() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.queued.cancel'
    });
  },

  lobbyRoomNavItemClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.left.navigation.lobby.clicked'
    });
  },

  lobbyNoResults(query) {
    if(query && query.length) {
      AnalyticsDispatcher.dispatch("analytics-event", {
        name: 'hipchat.client.lobby.noresults',
        properties: {
          queryLength: query.length
        }
      });
    }
  },

  lobbyFocusedWithKeyboardShortcut() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.keyboard.navigation.lobby.selected'
    });
  },

  quickSwitcherNoResults(query) {
    if(query && query.length) {
      AnalyticsDispatcher.dispatch("analytics-event", {
        name: 'hipchat.client.switcher.noresults',
        properties: {
          queryLength: query.length
        }
      });
    }
  },

  quickSwitcherViewed() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.switcher.viewed'
    });
  },

  logInToAnotherTeamClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.multiorg.account.another_team.clicked'
    });
  },

  fileUploadRequested(fileType, roomType, source) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: `hipchat.client.file.uploaded.${roomType}`,
      properties: {
        fileType: fileType,
        source: source
      }
    });
  },

  roomNotificationIconClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.room.notifications.icon.clicked'
    });
  },

  hideGifsClicked(oldVal, newVal) {
    AnalyticsDispatcher.dispatch('analytics-hide-gifs', {
      oldVal: oldVal,
      newVal: newVal
    });
  },

  privateRoomNotificationClicked(oldVal, newVal) {
    AnalyticsDispatcher.dispatch('analytics-room-notification-setting', {
      name: "hipchat.client.settings.notifications.privateroom",
      props: {
        oldVal: oldVal,
        newVal: newVal
      }
    });
  },

  openRoomNotificationClicked(oldVal, newVal) {
    AnalyticsDispatcher.dispatch('analytics-room-notification-setting', {
      name: "hipchat.client.settings.notifications.openroom",
      props: {
        oldVal: oldVal,
        newVal: newVal
      }
    });
  },

  lightThemeSelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.theme.light'
    });
  },

  darkThemeSelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.theme.dark'
    });
  },

  tighterTextDensitySelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.textdensity.tighter'
    });
  },

  normalTextDensitySelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.textdensity.normal'
    });
  },

  classicChatViewSelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.chatview.classic'
    });
  },

  classicNeueChatViewSelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.chatview.classicneue'
    });
  },

  fullNamesNameDisplaySelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.namedisplay.fullnames'
    });
  },

  mentionNamesNameDisplaySelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.namedisplay.mentionname'
    });
  },

  animatedAvatarsSelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.avatars.animated'
    });
  },

  staticAvatarsSelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.avatars.static'
    });
  },

  generalSettingsPanelSelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.general.clicked'
    });
  },

  notificationsSettingsPanelSelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.notifications.clicked'
    });
  },

  appearanceSettingsPanelSelected() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.settings.appearance.clicked'
    });
  },

  roomNotificationDropdownClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.room.notifications.dropdown.clicked'
    });
  },

  roomNotificationLevelChanged(oldValue, newValue) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.room.notifications.level.changed',
      properties: {
        oldValue: oldValue,
        newValue: newValue
      }
    });
  },

  globalNotificationLevelChanged(oldValue, newValue) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.global.notifications.level.changed',
      properties: {
        oldValue: oldValue,
        newValue: newValue
      }
    });
  },

  handleLaunchToActiveChatList(data) {
    AnalyticsDispatcher.dispatch('performance-timing:analytics-launch-to-active-chat-list', {
      size: _.get(data, "size")
    });
  },

  handleLaunchToChat(data) {
    AnalyticsDispatcher.dispatch('performance-timing:analytics-launch-to-chat', {
      size: _.get(data, "size")
    });
  },

  handleLaunchToChatComplete(data) {
    AnalyticsDispatcher.dispatch('performance-timing:analytics-launch-to-chat-complete', {
      jid: _.get(data, "jid"),
      id: _.get(data, "id")
    });
  },

  roomIntegrationsDropdownClicked(hasWarningIcon) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.room.integrations.dropdown.clicked',
      properties: {
        hasWarningIcon: hasWarningIcon
      }
    });
  },

  roomIntegrationsLinkClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.room.integrations.link.clicked'
    });
  },

  roomIntegrationsGlanceClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.room.integrations.glance.clicked'
    });
  },

  roomIntegrationsGlanceDismissed() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.room.integrations.glance.dismissed'
    });
  },

  tryToReconnectFromHeader() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.reconnection.header.try.again.button.clicked'
    });
  },

  connectionUIStateOffline() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.connection.ui.offline'
    });
  },

  connectionUIStateConnecting() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.connection.ui.connecting'
    });
  },

  connectionUIStateConnectDelay() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.connection.ui.connectdelay'
    });
  },

  connectionUIStateCannotConnect() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.connection.ui.cannotconnect'
    });
  },

  editProfileClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.top.navigation.profile.editProfile.clicked'
    });
  },

  searchInputClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.search.clicked'
    });
  },

  searchInputSubmitted(jidOrId) {
    let type;
    if (utils.jid.is_chat(jidOrId)){
      type = utils.room.detect_chat_type(jidOrId);
    } else if (utils.jid.is_lobby(jidOrId) || jidOrId === 'all') {
      type = 'all';
    } else if (jidOrId) {
      if (jidOrId === "muc") {
        type = 'allroom';
      } else if (jidOrId === "1-1") {
        type = 'allpeople';
      } else if (jidOrId.indexOf('rid') === 0) {
        type = 'groupchat';
      } else if (jidOrId.indexOf('uid') === 0) {
        type = 'chat';
      }
    }
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.search.submit',
      properties: {
        type
      }
    });
  },

  chatRoomMentionClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.chat.room.mention.clicked'
    });
  },

  inviteToRoomRightSidebarClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.lobby.invite.room.righticon.clicked'
    });
  },

  roomMenuInviteClicked() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.lobby.room.menu.invite.clicked'
    });
  },

  inviteUsersToRoomSent(type, numInvites) {
    let event;

    if (type === AnalyticsKeys.ROOM_MENU) {
      event = 'hipchat.client.lobby.room.menu.invite.sent';
    }

    if (type === AnalyticsKeys.RIGHT_SIDEBAR) {
      event = 'hipchat.client.lobby.invite.room.righticon.sent';
    }

    if (event){
      AnalyticsDispatcher.dispatch("analytics-event", {
        name: event,
        properties: {
          numInvites
        }
      });
    }
  },

  inviteTeamSent(type, numInvites) {
    let event;
    if (type === AnalyticsKeys.LOBBY){
      event = 'hipchat.client.lobby.invite.sent';
    } else if (AnalyticsKeys.TOP === type || AnalyticsKeys.LEFT === type) {
      event = `hipchat.client.${type}.navigation.invite.team.sent`;
    }
    if (event){
      AnalyticsDispatcher.dispatch("analytics-event", {
        name: event,
        properties: {
          numInvites
        }
      });
    }
  },

  slashCommandUsed({ room, slashUsed }) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.slash.used',
      properties: {
        slashUsed,
        room
      }
    });
  },

  slashCommandUsedInAutocomplete({ room, slashUsed }) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.slash.used.autocompleted',
      properties: {
        slashUsed,
        room
      }
    });
  },

  userInviteURLCopied() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: `hipchat.client.user.inviteURL.copied`
    });
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/analytics_actions.js
 **/