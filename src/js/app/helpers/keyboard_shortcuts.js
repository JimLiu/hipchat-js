import mousetrap from "mousetrap";
import AnalyticsDispatcher from "dispatchers/analytics_dispatcher";
import KeyboardActions from "actions/keyboard_shortcut_actions";
import DialogActions from "actions/dialog_actions";
import KeyboardShortcutStrings from "strings/keyboard_shortcut_strings";
import KeyboardShortcutActionKeys from "keys/keyboard_shortcut_action_keys";
import utils from "helpers/utils";
import ModalDialogStore from "stores/modal_dialog_store";

let KeyboardShortcuts = {

  /**
   * This method initializes the key commands. Pass an optional array of key commands.
   * If no key commands are provided defaults will be used.
   *
   * Simple example:
   * [{
   *   "keys": "command+j", // see https://craig.is/killing/mice for available options
   *   "action": "New chat" // default title and display will show in key commands dialog
   * }]
   *
   * Advanced example:
   * [{
   *   "keys": ["command+j", "command+n"], // array for multiple commands to single action
   *   "action": function(){ alert("example") }, // custom action
   *   "title": "New action!", // overwrite default title
   *   "display": "Cmd + J or Cmd + N" // overwrite default key display
   * }]
   */
  init(keyCommands) {
    this.commands = [];
    this.processCommands(keyCommands || this.getDefaults());
  },

  processCommands(keyCommands) {
    keyCommands.forEach((command) => {
      // must have keys and an associated action (string or function)
      // keys can be a string or array (for multiple commands with the same action)
      if (command.keys && command.action) {
        this.bindHandler(command);
      }

      // all key commands will be added to the visible list unless the property
      // display: false is passed. The default display is the "keys" property
      // but you can set this to anything with display: "example+any+key". If you
      // pass an array into the "keys" prop only the first will be use for display.
      if (command.display !== false) {
        this.addDisplayItem(command);
      }
    });
  },

  bindHandler(command) {
    let actionHandler = (typeof command.action === "function") ? command.action : this.getHandler(command.action);

    mousetrap.bind(command.keys, (e) => {
      this.dispatchAnalyticsEvent(command);
      return actionHandler.apply(this, [command, e]);
    });
  },

  dispatchAnalyticsEvent(command) {
    if (typeof command.action === 'function') {
      command.action = '[Function]';
    }
    AnalyticsDispatcher.dispatch('analytics-keyboard-shortcut-used', command);
  },

  addDisplayItem(command) {
    let title = (command.title) ? command.title : this.getTitle(command.action);
    let keys = this.formatDisplay(command.display || command.keys);

    this.commands.push({
      title,
      keys
    });
  },

  getTitle(action) {
    let title;

    switch (action) {
      case KeyboardShortcutActionKeys.NEW_CHAT:
        title = KeyboardShortcutStrings.new_chat;
        break;
      case KeyboardShortcutActionKeys.INVITE_TO_ROOM:
        title = KeyboardShortcutStrings.room_invite_users;
        break;
      case KeyboardShortcutActionKeys.CLOSE_ROOM:
        title = KeyboardShortcutStrings.close_room;
        break;
      case KeyboardShortcutActionKeys.CREATE_ROOM:
        title = KeyboardShortcutStrings.create_room;
        break;
      case KeyboardShortcutActionKeys.NAVIGATE_ROOMS_UP:
        title = KeyboardShortcutStrings.navigate_rooms_up;
        break;
      case KeyboardShortcutActionKeys.NAVIGATE_ROOMS_DOWN:
        title = KeyboardShortcutStrings.navigate_rooms_down;
        break;
      case KeyboardShortcutActionKeys.SEARCH_HISTORY:
        title = KeyboardShortcutStrings.search_history;
        break;
      case KeyboardShortcutActionKeys.TOGGLE_SOUND_NOTIFICATIONS:
        title = KeyboardShortcutStrings.toggle_sound_notifications;
        break;
      case KeyboardShortcutActionKeys.MARK_ROOMS_AS_READ:
        title = KeyboardShortcutStrings.mark_rooms_as_read;
        break;
      case KeyboardShortcutActionKeys.MARK_CHATS_AS_READ:
        title = KeyboardShortcutStrings.mark_chats_as_read;
        break;
      case KeyboardShortcutActionKeys.RECALL_OLDER_INPUT_HISTORY:
        title = KeyboardShortcutStrings.recall_older_input_history;
        break;
      case KeyboardShortcutActionKeys.RECALL_NEWER_INPUT_HISTORY:
        title = KeyboardShortcutStrings.recall_newer_input_history;
        break;
      case KeyboardShortcutActionKeys.VIEW_SHORTCUTS:
        title = KeyboardShortcutStrings.view_shortcuts;
        break;
      default:
        title = "";
    }
    return title;
  },

  getHandler(action) {
    let result;

    switch (action) {
      case KeyboardShortcutActionKeys.NEW_CHAT:
        result = this.openQuickSwitcher.bind(this);
        break;
      case KeyboardShortcutActionKeys.INVITE_TO_ROOM:
        result = this.inviteUsersToRoom.bind(this);
        break;
      case KeyboardShortcutActionKeys.CLOSE_ROOM:
        result = this.closeRoom.bind(this);
        break;
      case KeyboardShortcutActionKeys.CREATE_ROOM:
        result = this.createRoom.bind(this);
        break;
      case KeyboardShortcutActionKeys.NAVIGATE_ROOMS_UP:
        result = this.navigateRoomsUp.bind(this);
        break;
      case KeyboardShortcutActionKeys.NAVIGATE_ROOMS_DOWN:
        result = this.navigateRoomsDown.bind(this);
        break;
      case KeyboardShortcutActionKeys.SEARCH_HISTORY:
        result = this.searchHistory.bind(this);
        break;
      case KeyboardShortcutActionKeys.TOGGLE_SOUND_NOTIFICATIONS:
        result = this.toggleSoundNotifications.bind(this);
        break;
      case KeyboardShortcutActionKeys.MARK_ROOMS_AS_READ:
        result = this.markRoomsAsRead.bind(this);
        break;
      case KeyboardShortcutActionKeys.MARK_CHATS_AS_READ:
        result = this.markChatsAsRead.bind(this);
        break;
      case KeyboardShortcutActionKeys.VIEW_SHORTCUTS:
        result = this.showKeyboardShortcutsDialog.bind(this);
        break;
      case KeyboardShortcutActionKeys.REOPEN_LAST_CHAT:
        result = this.reopenLastChat.bind(this);
        break;
      case KeyboardShortcutActionKeys.RECALL_OLDER_INPUT_HISTORY:
        result = this.recallOlderInputHistory.bind(this);
        break;
      case KeyboardShortcutActionKeys.RECALL_NEWER_INPUT_HISTORY:
        result = this.recallNewerInputHistory.bind(this);
        break;
      default:
        result = null;
    }
    return result;
  },

  formatDisplay(display = "") {
    display = utils.toArray(display)[0];

    let keys = _.forEach(display.split("+"), (val, index, arr) => {
      val = val.toLowerCase();
      let type = (val === "command") ? "modifier" : "normal";
      let keyName = "";

      switch (val) {
        case "ctrl":
          keyName = KeyboardShortcutStrings.control;
          break;
        case "alt":
          keyName = KeyboardShortcutStrings.alt;
          break;
        case "shift":
          keyName = KeyboardShortcutStrings.shift;
          break;
        case "option":
          keyName = KeyboardShortcutStrings.option;
          break;
        case "command":
          keyName = KeyboardShortcutStrings.command;
          break;
        case "esc":
          keyName = KeyboardShortcutStrings.esc;
          break;
        case "tab":
          keyName = KeyboardShortcutStrings.tab;
          break;
        case "up":
          keyName = KeyboardShortcutStrings.up_arrow;
          break;
        case "down":
          keyName = KeyboardShortcutStrings.down_arrow;
          break;
        case "left":
          keyName = KeyboardShortcutStrings.left_arrow;
          break;
        case "right":
          keyName = KeyboardShortcutStrings.right_arrow;
          break;
        default:
          keyName = val;
      }

      arr[index] = {
        type: type,
        name: keyName
      };
    });
    return keys;
  },

  getDefaults() {
    let defaults = (utils.platform.isMac()) ? this.getDefaultsMac() : this.getDefaultsWindows();
    return defaults;
  },

  getDefaultsMac() {
    return [
      {
        "keys": "command+j",
        "action": KeyboardShortcutActionKeys.NEW_CHAT
      },
      {
        "keys": "command+i",
        "action": KeyboardShortcutActionKeys.INVITE_TO_ROOM
      },
      {
        "keys": "command+option+w",
        "action": KeyboardShortcutActionKeys.CLOSE_ROOM
      },
      {
        "keys": "command+option+up",
        "action": KeyboardShortcutActionKeys.NAVIGATE_ROOMS_UP
      },
      {
        "keys": "command+option+down",
        "action": KeyboardShortcutActionKeys.NAVIGATE_ROOMS_DOWN
      },
      {
        "keys": "command+option+f",
        "action": KeyboardShortcutActionKeys.SEARCH_HISTORY
      },
      {
        "keys": "command+shift+s",
        "action": KeyboardShortcutActionKeys.TOGGLE_SOUND_NOTIFICATIONS
      },
      {
        "keys": "command+option+m",
        "action": KeyboardShortcutActionKeys.MARK_ROOMS_AS_READ
      },
      {
        "keys": "command+option+shift+m",
        "action": KeyboardShortcutActionKeys.MARK_CHATS_AS_READ
      },
      {
        "keys": "option+up",
        "action": KeyboardShortcutActionKeys.RECALL_OLDER_INPUT_HISTORY
      },
      {
        "keys": "option+down",
        "action": KeyboardShortcutActionKeys.RECALL_NEWER_INPUT_HISTORY
      },
      {
        "keys": "command+/",
        "action": KeyboardShortcutActionKeys.VIEW_SHORTCUTS
      }
    ];
  },

  getDefaultsWindows() {
    return [
      {
        "keys": "ctrl+j",
        "action": KeyboardShortcutActionKeys.NEW_CHAT
      },
      {
        "keys": "ctrl+i",
        "action": KeyboardShortcutActionKeys.INVITE_TO_ROOM
      },
      {
        "keys": "ctrl+alt+w",
        "action": KeyboardShortcutActionKeys.CLOSE_ROOM
      },
      {
        "keys": "ctrl+alt+up",
        "action": KeyboardShortcutActionKeys.NAVIGATE_ROOMS_UP
      },
      {
        "keys": "ctrl+alt+down",
        "action": KeyboardShortcutActionKeys.NAVIGATE_ROOMS_DOWN
      },
      {
        "keys": "ctrl+alt+f",
        "action": KeyboardShortcutActionKeys.SEARCH_HISTORY
      },
      {
        "keys": "ctrl+shift+s",
        "action": KeyboardShortcutActionKeys.TOGGLE_SOUND_NOTIFICATIONS
      },
      {
        "keys": "ctrl+alt+m",
        "action": KeyboardShortcutActionKeys.MARK_ROOMS_AS_READ
      },
      {
        "keys": "ctrl+alt+shift+m",
        "action": KeyboardShortcutActionKeys.MARK_CHATS_AS_READ
      },
      {
        "keys": "ctrl+up",
        "action": KeyboardShortcutActionKeys.RECALL_OLDER_INPUT_HISTORY
      },
      {
        "keys": "ctrl+down",
        "action": KeyboardShortcutActionKeys.RECALL_NEWER_INPUT_HISTORY
      },
      {
        "keys": "ctrl+/",
        "action": KeyboardShortcutActionKeys.VIEW_SHORTCUTS
      }
    ];
  },

  getKeyCommands() {
    return this.commands;
  },

  getCommandByTitle(title) {
    let command = _.find(this.commands, { 'title': title });

    if (command) {
      return command.keys.map((key) => {
        return key.name;
      });
    }
  },

  openQuickSwitcher() {
    if (ModalDialogStore.getCurrentModalDialog()) {
      return false;
    }

    DialogActions.showQuickSwitcherDialog(true); //true param to hide hint
    return false;
  },

  inviteUsersToRoom() {
    KeyboardActions.inviteUsersToRoom();
    return false;
  },

  createRoom() {
    KeyboardActions.createRoom();
    return false;
  },

  searchHistory() {
    KeyboardActions.searchHistory();
    return false;
  },

  closeRoom() {
    KeyboardActions.closeRoom();
    return false;
  },

  navigateRoomsUp() {
    KeyboardActions.navigateRoomsUp();
    return false;
  },

  navigateRoomsDown() {
    KeyboardActions.navigateRoomsDown();
    return false;
  },

  openSettings() {
    KeyboardActions.openSettings();
    return false;
  },

  toggleSoundNotifications() {
    KeyboardActions.toggleSoundNotifications();
    return false;
  },

  markRoomsAsRead() {
    KeyboardActions.markRoomsAsRead();
    return false;
  },

  markChatsAsRead() {
    KeyboardActions.markChatsAsRead();
    return false;
  },

  showKeyboardShortcutsDialog() {
    DialogActions.showKeyboardShortcutsDialog(this.commands);
    return false;
  },

  reopenLastChat() {
    KeyboardActions.reopenLastChat();
    return false;
  },

  recallOlderInputHistory(command, e) {
    KeyboardActions.recallOlderInputHistory(e);
    return false;
  },

  recallNewerInputHistory(command, e) {
    KeyboardActions.recallNewerInputHistory(e);
    return false;
  }

};

export default KeyboardShortcuts;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/keyboard_shortcuts.js
 **/