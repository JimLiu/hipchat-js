import ChatInputActions from 'actions/chat_input_actions';
import AppHeaderActions from 'actions/app_header_actions';
import KeyboardShortcuts from "helpers/keyboard_shortcuts";
import DialogActions from "actions/dialog_actions";
import ChatHeaderActions from 'actions/chat_header_actions';
import FormActions from 'actions/form_actions';
import FormsStrings from 'strings/forms_strings';
import FlagActions from 'actions/flag_actions';
import CurrentUserActions from 'actions/current_user_actions';
import Presence from 'lib/enum/presence';
import logger from 'helpers/logger';
import utils from 'helpers/utils';

export function matchCommand(data = {}) {
  let is_private_chat = utils.jid.is_private_chat(data.jid);
  for (let command of commands) {
    if (command.matcher.test(data.text) &&
      (command.members_only && !data.is_guest || !command.members_only) &&
      (command.oto_only && is_private_chat || !command.oto_only) &&
      (command.room_only && !is_private_chat || !command.room_only) &&
      (command.filter && command.filter(data) || !command.filter)) {
      return command;
    }
  }
}

export function executeCommand(command, data = {}) {
  if (command && command.action) {
    command.action(data);
    logger.type('slash-commands').log('Action executed for command: ', command.name);
  }
}

export function clearAction({ jid }) {
  ChatInputActions.clearChat({jid});
}

export function partAction({ jid }) {
  ChatInputActions.closeChat({jid});
  ChatInputActions.clearChatInput();
}

export function topicAction({ text }) {
  let topic = text.replace(this.matcher, "").trim();
  ChatHeaderActions.changeTopic(topic);
  ChatInputActions.clearChatInput();
}

export function renameAction({ jid, text }) {
  var roomName = text.replace(this.matcher, "").trim();

  FormActions.changeRoomName({
    jid,
    name: roomName
  }, (error) => {
    if (error) {
      let error_msg = error.message || FormsStrings.fail.rename_flag;
      FlagActions.showFlag({
        type: "error",
        body: error_msg,
        close: "auto"
      });
    } else {
      FlagActions.showFlag({
        type: "success",
        body: FormsStrings.success.rename_flag,
        close: "auto"
      });
    }
  });
  ChatInputActions.clearChatInput();
}

export function joinAction({ text }) {
  let room = text.replace(this.matcher, "").trim();
  ChatInputActions.clearChatInput();
  ChatInputActions.joinChat({room});
}

export function shortcutsAction() {
  var commands = KeyboardShortcuts.getKeyCommands();
  DialogActions.showKeyboardShortcutsDialog(commands);
  ChatInputActions.clearChatInput();
}

export function settingsAction() {
  AppHeaderActions.requestPreferencesDialog();
  ChatInputActions.clearChatInput();
}

export function callAction({ jid, videoService, room_id, room_is_archived }) {
  if (utils.jid.is_room(jid) && !room_is_archived) {
    ChatHeaderActions.startEnsoRoomVideo({
      jid: jid,
      room_id: room_id
    });
  } else {
    ChatHeaderActions.startCall({
      jid,
      service: videoService
    });
  }
  ChatInputActions.clearChatInput();
}

export function presenceAction({ text }) {
  var index = text.indexOf(' '),
    show_type = text,
    payload = {
      type: 'showAndStatus'
    },
    status;

  if (_.includes(text, ' ')) {
    status = text.substr(index).trim();
    if (status) {
      payload.status = status;
    }
    show_type = show_type.substr(0, index);
  }

  switch (show_type.substr(1)) {
    case 'available':
    case 'here':
    case 'back':
      payload.show = Presence.AVAILABLE;
      break;

    case 'away':
      payload.show = Presence.AWAY;
      break;

    case 'dnd':
      payload.show = Presence.DND;
      break;
  }

  CurrentUserActions.changeStatus(payload);
  ChatInputActions.clearChatInput();
}

export const commands = [
  {
    name: '/topic',
    aliases: [],
    description: 'Change chat topic',
    usage: '[new topic]',
    members_only: true,
    room_only: true,
    matcher: /^\/(topic)\s/,
    action: topicAction
  },
  {
    name: '/rename',
    aliases: [],
    description: 'Rename a room',
    usage: '[new name]',
    members_only: true,
    room_only: true,
    matcher: /^\/(rename)\s/,
    action: renameAction
  },
  {
    name: '/clear',
    aliases: [],
    description: 'Locally clears history for chat',
    usage: null,
    matcher: /^\/clear\s?$/,
    action: clearAction
  },
  {
    name: '/join',
    aliases: [
      '/enter'
    ],
    description: 'Join a room or 1-1 chat',
    usage: '[or /enter] [room name/user mention]',
    members_only: true,
    matcher: /^\/(join|enter)\s/,
    action: joinAction
  },
  {
    name: '/part',
    aliases: [
      '/close',
      '/leave'
    ],
    description: 'Leave a room or 1-1 chat',
    usage: '[or /close, /leave]',
    members_only: true,
    matcher: /^\/(part|leave|close)\s?$/,
    action: partAction
  },
  {
    name: '/me',
    aliases: [
      '/em'
    ],
    description: 'Display action text',
    usage: '[or /em] your message',
    members_only: true,
    matcher: /^\/(me|em)\s/,
    should_send_message: true
  },
  {
    name: '/quote',
    aliases: [],
    description: 'Display quote message',
    usage: 'your message',
    matcher: /^\/(quote)\s\w/,
    should_send_message: true
  },
  {
    name: '/code',
    aliases: [],
    description: 'Display code snippet',
    usage: 'some code',
    matcher: /^\/(code)\s\w/,
    should_send_message: true
  },
  {
    name: '/pre',
    aliases: [
      '/monospace'
    ],
    description: 'Display text in monospaced font',
    usage: '[or /monospace] some text',
    matcher: /^\/(pre|monospace)\s\w/,
    should_send_message: true
  },
  {
    name: '/here',
    aliases: [
      '/available',
      '/back'
    ],
    description: 'Set presence to available',
    usage: '[or /available, /back] [your status]',
    matcher: /^\/(here|available|back)\s?/,
    action: presenceAction
  },
  {
    name: '/away',
    aliases: [],
    description: 'Set presence to away',
    usage: '[your status]',
    matcher: /^\/(away)\s?/,
    action: presenceAction
  },
  {
    name: '/dnd',
    aliases: [],
    description: 'Set presence to do not disturb',
    usage: '[your status]',
    matcher: /^\/(dnd)\s?/,
    action: presenceAction
  },
  {
    name: '/shortcuts',
    aliases: [
      '/keys'
    ],
    description: 'Open the keyboard shortcuts dialog',
    usage: '[or /keys]',
    members_only: true,
    matcher: /^\/(shortcuts|keys)\s?$/,
    action: shortcutsAction
  },
  {
    name: '/settings',
    aliases: [
      "/prefs"
    ],
    description: 'Open the settings dialog',
    usage: '[or /prefs]',
    members_only: true,
    matcher: /^\/(prefs|settings)\s?$/,
    action: settingsAction
  },
  {
    name: '/videocall',
    aliases: [
      '/call'
    ],
    description: 'Start video call',
    usage: '[or /call]',
    members_only: true,
    oto_only: false,
    matcher: /^\/(videocall|call)\s?$/,
    action: callAction,
    filter: ({ jid, video_enabled, room_video_enabled }) => {
      return utils.jid.is_room(jid) ? room_video_enabled : video_enabled;
    }
  }
];



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/slash_command_helper.js
 **/