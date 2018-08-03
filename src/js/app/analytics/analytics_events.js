import Emoticons from "helpers/emoticons";
import regex_helpers from "helpers/regex_helpers";
import utils from "helpers/utils";
import AppConfig from "config/app_config";
import AppStore from 'stores/application_store';
import Presence from 'lib/enum/presence';

var hasEnteredText = false;
var ALL_MENTION_REGEX = /(?=[^\\w>]|^)@all(?=[^\\w<]|$)/gi;
var HERE_MENTION_REGEX = /(?=[^\\w>]|^)@here(?=[^\\w<]|$)/gi;
var USER_MENTION_REGEX = /(?=[^\\w]|^)@[a-z0-9\-]+(?=[^\\w]|$)/gi;
var URL_MENTION_REGEX = new RegExp(regex_helpers.url, "gi");

var SLASH_COMMAND_REGEX = /\/(join|part|topic|available|away|dnd|code|quote|pre|monospace|clear|me)\s/;

/**
 * Adds an input abandoned event if there is current text in the input field.
 * @param events
 */
function checkChatAbandoned(events) {
  if (hasEnteredText) {
    events.push({
      name: "hipchat.client.message.input.abandoned"
    });
  }
}

/**
 * Can be called when a room is closed and a new one is subsequently selected.
 * So please don't remove the isClosed below. :)
 *
 * @param properties
 * @return {*}
 */
function onSelectRoom({ isClosed, jid, type }) {

  let isLobby = utils.jid.is_lobby(jid);
  let event = {
    name: (isLobby) ? "hipchat.client.lobby.viewed" : "hipchat.client.chat.viewed"
  };

  let finalProps = {};

  if (isClosed) {
    finalProps.isClosed = true;
  }

  if (!isLobby) {
    finalProps.type = type;
    if (utils.jid.is_room(jid)) {
      let room = AppStore.get('allRooms')[jid];
      if (room){

        let roster = AppStore.get('roster');

        let participants = _.get(room, 'participants.members', [])
                            .concat(_.get(room, 'participants.guests', []));

        finalProps.room = room.id;
        finalProps.room_name = room.name;
        finalProps.private = utils.jid.is_private_room(room.privacy) ? 'yes' : 'no';

        finalProps.here_size = _.values(
                                  _.pick(roster, participants)
                                )
                                .filter((user) => _.get(user, 'presence.show') === Presence.AVAILABLE)
                                .length;

        finalProps.all_size = participants.length;
      }
    }
  }

  if (!_.isEmpty(finalProps)) {
    event.properties = finalProps;
  }

  let events = [event];

  checkChatAbandoned(events);

  return events;
}

/**
 * Called when a room is newly opened.
 *
 * @param properties
 * @return {*}
 */
function onOpenRoom(properties) {
  var props = {
    isNew: true,
    type: properties.type,
    source: properties.source
  };

  var type = utils.jid.is_room(properties.jid) ? 'room' : 'oto';
  var source = props.source || "lobby";
  var event = (source === 'switcher') ? `hipchat.client.switcher.open.${type}` : `hipchat.client.lobby.open.${type}`;

  if (source === "lobby" || source === 'switcher') {
    props.filter_text_length = (properties.query) ? properties.query.length : 0;
  }

  return {
    name: event,
    properties: props
  };
}

function onChatInputChanged(text) {
  hasEnteredText = !_.isEmpty(text);
}

function messageContainsGroupMention(message) {
  message = message.trim();
  return ALL_MENTION_REGEX.test(message) || HERE_MENTION_REGEX.test(message);
}

/**
 * TODO make this use the roster.
 * @param message
 * @returns {boolean}
 */
function messageContainsUserMention(message) {
  message = message.trim();
  return USER_MENTION_REGEX.test(message);
}

function onChatSent(data) {
  var events = [];
  if (hasEnteredText) {
    let emoticons = Emoticons.getEmoticonsInfo(data.text);
    emoticons.forEach((emoticon) => {
      events.push({
        name: "hipchat.client.emoticon.used",
        properties: {
          room: (data.chat_type === 'groupchat') ? data.active_chat_id : null,
          emoticonUsed: emoticon.shortcut,
          emoticonType: emoticon.type
        }
      });
    });

    if (messageContainsGroupMention(data.text)) {
      events.push({
        name: "hipchat.client.message.group.mentioned"
      });
    } else if (messageContainsUserMention(data.text)) {
      events.push({
        name: "hipchat.client.message.user.mentioned"
      });
    }

    if (URL_MENTION_REGEX.test(data.text)) {
      events.push({
        name: "hipchat.client.message.url.sent"
      });
    }

    let slashCommand = SLASH_COMMAND_REGEX.exec(data.text);
    if (slashCommand) {
      events.push({
        name: "hipchat.client.slash.command.used",
        properties: {
          command: slashCommand[1]
        }
      });
    }

    if (AppConfig.slash_replacement_regex.test(data.text)) {
      events.push({
        name: "hipchat.client.slash.command.used",
        properties: {
          command: 'replacement'
        }
      });
    }

    hasEnteredText = false;
  }

  return events;
}

function onCreateRoom(submit_data) {
  return [
    {name: "hipchat.client.room.created"},
    {name: `hipchat.client.room.${submit_data.privacy}.created`}
  ];
}

function onUpdatePresence(presence) {
  var eventType;
  switch(presence.show) {
    case "xa":
      eventType = "away";
      break;
    case "dnd":
      eventType = "donotdisturb";
      break;
    case "chat":
      eventType = "available";
  }

  if (eventType) {
    return {
      name: "hipchat.client.top.navigation.profile.status.clicked." + eventType
    };
  }
}

function onUpdateStatusMessage(presence) {
  return {
    name: "hipchat.client.top.navigation.profile.status.statusmessage",
    properties: {
      custom: presence.status === "" ? false : true
    }
  };
}

function handleAnalyticsEvent(event) {
  return event;
}

function onFilterLobby(data) {
  var type;

  if (data && data.scope) {
    switch(data.scope) {
      case "all":
        type = "search";
        break;
      default:
        type = data.scope;
    }
    return {
      name: "hipchat.client.lobby.filter." + type
    };
  }
}

function getAddonKey(data) {
  var addonKey = 'unknown-addon';
  if(data && data.addon_key) {
    addonKey = data.addon_key;
  }
  return {addonKey: addonKey};
}

function onConnectDialogClose(data) {
  return {
    name: "hipchat.client.connect.dialog.close",
    properties: getAddonKey(data)
  };
}


function onConnectDialogLinkClick(data) {
  return {
    name: "hipchat.client.connect.dialog.link.click",
    properties: getAddonKey(data)
  };
}

function onConnectAnalyticsEvent(data) {
  return {
    name: data.name,
    properties: data.data
  };
}

function onHideGifsClick(props) {
  return {
    name: "hipchat.client.settings.general.hidegifs",
    properties: props
  };
}

function onRoomNotificationSettingClick(data) {
  return {
    name: data.name,
    properties: data.props
  };
}

function onKeyboardShortcutUsed(data) {
  return {
    name: "hipchat.client.keyboard.shortcut.used",
    properties: data
  };
}

function onSecureFileDownload() {
  return {
    name: "hipchat.client.secure.file.download"
  };
}

export default {
  events: {
    "analytics-select-room": onSelectRoom,
    "analytics-open-room": onOpenRoom,
    "analytics-set-message-value": onChatInputChanged,
    "analytics-send-message": onChatSent,
    "analytics-create-room": onCreateRoom,
    "analytics-event": handleAnalyticsEvent,
    "analytics-update-presence": onUpdatePresence,
    "analytics-update-status-message": onUpdateStatusMessage,
    "analytics-filter-lobby": onFilterLobby,
    "analytics-connect-dialog-click": onConnectDialogLinkClick,
    "analytics-connect-dialog-close": onConnectDialogClose,
    "analytics-connect-event": onConnectAnalyticsEvent,
    "analytics-hide-gifs": onHideGifsClick,
    "analytics-room-notification-setting": onRoomNotificationSettingClick,
    "analytics-keyboard-shortcut-used": onKeyboardShortcutUsed,
    "analytics-secure-file-download": onSecureFileDownload
  },

  /**
   * Exposed for testing
   * @private
   */
  __reset: function() {
    hasEnteredText = false;
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/analytics/analytics_events.js
 **/