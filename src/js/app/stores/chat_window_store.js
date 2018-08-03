/*global HC*/
import utils from 'helpers/utils';
import moment from'moment';
import DAL from 'core/dal';
import Store from 'lib/core/store';
import PreferencesStore from "./preferences_store";
import AppDispatcher from "dispatchers/app_dispatcher";
import AnalyticsDispatcher from "dispatchers/analytics_dispatcher";
import appConfig from'config/app_config';
import logger from 'helpers/logger';
import NetworkStatusHelper from 'helpers/network_status_helper';
import { smileys as allSmileys } from 'helpers/emoticons';
import AnalyticsActions from 'actions/analytics_actions';
import { uiAvailablePromise } from 'helpers/analytics';

function deepFreeze(o) {
  if (!Object.isFrozen(o)) {
    Object.freeze(o);
  }

  if (_.isArray(o)) {
    o.forEach(deepFreeze);
  } else if (_.isObject(o)) {
    _.forOwn(o, deepFreeze);
  }

  return o;
}

const NoMessages = deepFreeze([]);

/*
 * Create message clone with updated fields.
 *
 * @param {Object} msg source message
 * @param {Object|Function} patch object with new message fields or function which returns such object.
 * @returns {Object} cloned message with updated fields.
 */
function patchMsg(msg, patch) {
  if (_.isFunction(patch)) {
    patch = patch(msg);
  }
  return _.defaultsDeep({}, patch, msg);
}

function sortingIdentity(msg) {
  return [ msg.sortTime || msg.time, msg.time ];
}

function insertSortedMsg(messages, msg) {
  let pos = _.sortedLastIndexBy(messages, msg, sortingIdentity);
  messages.splice(pos, 0, msg);
}

function patchMsgByMid(chat, mid, patch) {
  let pos = _.findIndex(chat.messages, {mid});
  if (pos === -1) {
    return undefined;
  }

  let original = chat.messages[pos];
  let patched = patchMsg(original, patch);

  let messages = _.clone(chat.messages);

  if (original.time === patched.time) {
    // replace old msg
    messages.splice(pos, 1, patched);
  } else {
    // remove old msg
    messages.splice(pos, 1);
    // insert new one
    insertSortedMsg(messages, patched);
  }

  deepFreeze(messages);

  chat.messages = messages;

  return patched;
}

const emoticonsRegExp = /\([a-z0-9]*\)/gi;

export function hasEmoticons(str) {
  emoticonsRegExp.lastIndex = 0;
  return (emoticonsRegExp.test(str) ||
    !!_.findKey(allSmileys, smiley => {
      smiley.regex.lastIndex = 0;
      return smiley.regex.test(str);
    }));
}

export function sortMessages(messages) {
  return _.sortBy(messages, sortingIdentity);
}

function isIgnoredMessage (msg) {
  return msg.is_presence_message || msg.is_missed_call_message || _.includes(['unconfirmed', 'failed', 'flaky'], msg.status);
}

export function withoutManufacturedMessages(messages) {
  return _.reject(messages, isIgnoredMessage);
}

export function getMessageCountToPreserveInBg(chat, messages) {
  let unreadMessagesCount = chat.unreadCount || 0;

  if (chat.isScrolledToBottom) {
    return appConfig.chat_room_trim_buffer + unreadMessagesCount;
  }

  let visibleMsgsCount = messages.length - _.findLastIndex(messages, {mid: chat.oldestVisibleMessageMid});
  return appConfig.chat_room_trim_buffer + unreadMessagesCount + visibleMsgsCount;
}

export function getMessageCountToPreserve(chat, messages) {
  if (chat.isScrolledToBottom && messages.length > appConfig.chat_room_trim_buffer) {
    return messages.length - 1;
  }

  return messages.length;
}

export function addSortTime(msg, lookupMessageByMid, attach_reordering_enabled = false) {
  if (!attach_reordering_enabled) {
    // not enabled
    return;
  }

  if(msg.sortTime) {
    // previously done
    return;
  }

  let attachTo = utils.getAttachToMid(msg);
  if(!attachTo) {
    return;
  }

  let parent = lookupMessageByMid(attachTo);
  if(parent) {
    msg.sortTime = parent.time;

    // Original times are in seconds
    var deltaMins = (msg.time - parent.time) / 60;
    if(deltaMins > appConfig.notification_attach_to_reorder_limit_mins) {
      // Outside the allowed send window, don't reorder the notification
      msg.sortTime = msg.time;
    }
  }
}

export function addNewMessages(messages, newMessages, attach_reordering_enabled = false) {
  if (!newMessages.length) {
    return messages;
  }

  let result = _.clone(messages);

  let newMessagesByMid = null;
  let messagesByMid = null;

  /**
   * Finds a message by it's mid in newMessages, or if not found messages.
   *
   * Will lazily initialise the mapping from mid to message to avoid doing it if not required.
   *
   * @param mid
   * @return the found message, if not undefined
   */
  function lookupMessageByMid(mid) {
    let msg;

    if(!newMessagesByMid) {
      newMessagesByMid = _.keyBy(newMessages, 'mid');
    }

    msg = newMessagesByMid[mid];

    if(!msg) {
      if(!messagesByMid) {
        messagesByMid = _.keyBy(messages, 'mid');
      }

      msg = messagesByMid[mid];
    }

    return msg;
  }

  // insert new messages using binary search
  newMessages.forEach(function (msg) {
    addSortTime(msg, lookupMessageByMid, attach_reordering_enabled);

    // check if there is already message with such mid
    let pos = _.findIndex(result, {mid: msg.mid});
    if (pos > -1) { // if yes then replace it with new instance
      result.splice(pos, 1, msg);
    } else { // if no then just add new message
      insertSortedMsg(result, msg);
    }
  });

  return result;
}

class ChatWindowStore extends Store {
  constructor() {

    super();

    this.local = {
      should_queue_changes: {},
      queued_messages: {},
      echoed_chats: {},
      replacement_messages: {},
      flaky_network_failed_timestamp: false,
      flaky_network_recoverable_timestamp: false,
      failed_messages: [],
      messages_timers: {},
      history_timers: {}
    };
  }

  getNowTimestamp(){
    var now = Date.now() / 1000;
    return utils.format_time_for_history(now);
  }

  getChatDefaults(){
     return {
       name: '',
       jid: '',
       messages: [],
       oldest_timestamp: '',
       newest_timestamp: this.getNowTimestamp(),
       oldest_mid: '',
       newest_mid: '',
       scrollTop: '',
       isScrolledToBottom: true,
       active: false,
       fully_initialized: false,
       fetching_recent: false,
       fetching_ancient: false,
       ancient_history_is_empty: false,
       has_no_message_history: false,
       should_scroll_to_bottom: true,
       ancient_msgs: {},
       recent_msgs: {},
       is_composing: false,
       last_active: false,
       has_been_cleared: false
     };
  }

  getDefaults() {
    return {
      current_user: {},
      chats: {},
      active_chat: false,
      active_chat_changed_token: null,
      mentionRegex: null,
      emoticons: {},
      preferences: {},
      initialized: false,
      replace_text_emoticons: PreferencesStore.shouldReplaceTextEmoticons(),
      chat_show_sidebar: PreferencesStore.shouldShowChatSidebar(),
      groupchat_show_sidebar: PreferencesStore.shouldShowGroupChatSidebar(),
      zoom_level: 1,
      web_server: ''
    };
  }

  registerListeners() {
    AppDispatcher.registerOnce({
      'hc-init': () => {
        this.set('active_chat', PreferencesStore.getChatToFocus());
      },
      'initialize-chat-window-store': (data) => {
        this.set(data);
      }
    });
    AppDispatcher.register({
      'updated:config': (config) => {
        this.set({
          attach_reordering_enabled: _.get(config, 'feature_flags.web_client_attach_to_message_reorder_enabled'),
          honest_messages_enabled: _.get(config, 'feature_flags.web_client_honest_messages')
        });
      },
      'updated:emoticons': (emoticons) => {
        this.updateEmoticons(emoticons);
      },
      'updated:web_server': (server) => {
        this.data.web_server = server;
      },
      'updated:current_user': (user) => {
        this.data.current_user.user_jid = user.user_jid;
        this.data.current_user.is_guest = user.is_guest;
      },
      'updated:mentionRegex': (regex) => {
        this.data.mentionRegex = regex;
      },
      'updated:activeRooms': (rooms) => {
        this.updateRooms(rooms);
      },
      'updated:newMessages': (messages) => {
        this.updateChatMessages(messages);
      },
      'updated:preferences': (newPreferences) => {
        this._onPreferencesUpdated(newPreferences);
      },
      'before:updated:active_chat': (jid) => {
        let chat = this.data.chats[this.data.active_chat];
        if (!chat) {
          return;
        }
        if (jid !== this.data.active_chat) {
          // if switching rooms, clear indicated last read
          chat.last_read_indicated = null;
        }
        if (this.data.chats[this.data.active_chat].fully_initialized) {
          this.flushQueue(this.data.active_chat);
          this.updateMessageBounds(chat);
          chat.last_active = new Date();
        }
      },
      'updated:active_chat': (jid) => {
        if (utils.jid.is_chat(jid) && this.data.chats[jid] && this.data.initialized) {
          this.handleRoomSelect(jid);
        } else {
          this.set('active_chat', jid);
        }
        AppDispatcher.dispatch('close-file-viewer');
      },
      'send-message': (data) => {
        this.data.chats[data.jid].should_scroll_to_bottom = true;
        if (!this.data.chats[data.jid].fetching_ancient) {
          this.flushQueue(data.jid);
        }
      },
      'upload-file': (data) => {
        this.data.chats[data.jid].should_scroll_to_bottom = true;
      },
      'toggle-image': (data) => {
        this.toggleImage(data.jid, data.mid);
      },
      'retry-failed-message': (msg) => {
        this.resendMessage(msg);
      },
      'cancel-failed-message': (msg) => {
        this.removeFailedMessage(msg);
      },
      'clear-messages': (data) => {
        let chat = this.data.chats[data.jid];
        if (chat) {
          chat.messages = NoMessages;
          chat.has_been_cleared = true;
          this.updateChats(data.jid);
        }
      },
      'app-state-ready': () => {
        if (this.data.current_user.is_guest) {
          this.data.chats[this.data.active_chat].fully_initialized = true;
        }
        this.set('initialized', true);
        if (utils.jid.is_chat(this.data.active_chat)) {
          this.handleRoomSelect(this.data.active_chat);
        }
      },
      'readstate-received': () => {
        if (utils.jid.is_chat(this.data.active_chat) && this.data.chats[this.data.active_chat]) {
          this.handleRoomSelect(this.data.active_chat);
        }
      },
      'initial-join-presence-sent': (data) => {
        if (this.data.chats[data.jid] && data.with_history) {
          this.initialJoinWithHistory(data.jid);
          this.handleRoomSelect(data.jid);
        }
      },
      'set-scroll-value': (data) => {
        _.assign(this.data.chats[data.jid], {
          scrollTop: data.scrollTop,
          isScrolledToBottom: data.isScrolledToBottom,
          should_scroll_to_bottom: data.should_scroll_to_bottom
        });
      },
      'message-media-loaded': (data) => {
         if (!this.data.chats[data.jid]){
           logger.type('message-media-loaded').error('Room is not found', data.jid);
           return;
         }
         let msg = patchMsgByMid(this.data.chats[data.jid], data.mid, {
           media_loaded: true
         });
        if (msg) {
            this.updateChats(msg.room);
         }
      },
      'message-media-size-found': (data) => {
        if (!this.data.chats[data.jid]){
          logger.type('message-media-size-found').error('Room is not found', data.jid);
          return;
        }
        let msg = patchMsgByMid(this.data.chats[data.jid], data.mid, {
          media_sizes: {
            [data.src]: data.size
          }
        });
        if (msg) {
          this.updateChats(msg.room);
        }
      },
      'display-message-action': (data) => {
        var chat = _.get(this.data.chats, data.jid, {});
        var should_scroll_to_bottom = chat.should_scroll_to_bottom;
        var message_action_active = chat.message_action_active || false;
        var next_state = {should_scroll_to_bottom: should_scroll_to_bottom, message_action_active: message_action_active};

        var states = _.get(chat, "message_action_previous_state", []);
        states.push(next_state);

        _.assign(this.data.chats[data.jid], {
          should_scroll_to_bottom: false,
          isScrolledToBottom: false,
          message_action_active: true,
          message_action_previous_state: states
        });
      },
      'hide-message-action': (data) => {
        var chat = _.get(this.data.chats, data.jid, {});
        var previous_states = _.get(chat, "message_action_previous_state", [{
          should_scroll_to_bottom: chat.should_scroll_to_bottom,
          message_action_active: false
        }]);

        var previous_state = previous_states.pop();
        var should_scroll_to_bottom = previous_state.should_scroll_to_bottom;
        var message_action_active = previous_state.message_action_active;

        _.assign(this.data.chats[data.jid], {
          should_scroll_to_bottom: should_scroll_to_bottom,
          message_action_active: message_action_active,
          message_action_previous_state: previous_states
        });

        // Force chat to bottom if was previously at bottom of screen
        this.updateChats(data.jid);
      },
      'chat-is-scrolling': (data) => {
        this.local.should_queue_changes[data.jid] = data.scrolling;
        if (!data.scrolling) {
          this.flushQueue(data.jid);
        }
      },
      'requesting-ancient-history': (data) => {
        if (!this.data.current_user.is_guest) {
          this.fetchXMPPHistory(data.jid);
        }
      },
      'network-down': () => {
        this.local.flaky_network_failed_timestamp = utils.now() + DAL.Connection.getSessionRecoveryTime();
        this.local.flaky_network_recoverable_timestamp = utils.now() + appConfig.flaky_network_message_timeout;
      },
      'network-up': () => {
        this.local.flaky_network_failed_timestamp = false;
        this.local.flaky_network_recoverable_timestamp = false;
      },
      'strophe-reconnected': () => {
        //after strophe reconnects, we need to defer this until after the config is updated due to the startup iq coming in
        AppDispatcher.registerOnce('after:updated:config', () => {
          AppDispatcher.dispatch('hide-join-messages');
          this.local.flaky_network_failed_timestamp = false;
          this.local.flaky_network_recoverable_timestamp = false;
          if (!this.data.current_user.is_guest) {
            _.forEach(_.filter(this.data.chats, 'fully_initialized'), (room) => {
              this.fetchAPIHistory(room.jid);
            });

            _.forEach(this.data.chats, (room) => {
              if (room.fetching_ancient) {
                this.fetchXMPPHistory(room.jid, true);
              }
            });

            if (utils.jid.is_chat(this.data.active_chat) && this.data.chats[this.data.active_chat] && !this.data.chats[this.data.active_chat].fully_initialized) {
              this.fetchXMPPHistory(this.data.active_chat, true);
            }
          }
        });
      },
      'show-empty-state': (data) => {
        this.data.chats[data.jid].ancient_history_is_empty = true;
        this.updateChats(data.jid);
      },
      'status-message-received': (data) => {
        this.handleUserStateMessage(data);
      },
      'replacement-message-received': (data) => {
        if (this.local.replacement_messages[data.jid]) {
          this.local.replacement_messages[data.jid].push(data);
        } else {
          this.local.replacement_messages[data.jid] = [data];
        }
      },
      'set-chat-panel-zoom': (data) => {
        this.set({
          zoom_level: data.zoom
        });
      },
      'toggle-attached-cards': (anchor_mid) => {
        this.toggleAttachedCards(anchor_mid);
      },
      'before:API:fetched-recent-history': (data) => {
        let chat = this.data.chats[data.jid];
        if (chat) {
          // Blow away all messages if the fetched messages begin with a mid that we haven't received yet
          if (data.mid && _.map(data.results, 'id').indexOf(data.mid) === -1) {
            this.removeChatMessages(data.jid);
          }
        }
      },
      'API:fetched-recent-history': (data) => {
        this.handleRecentHistoryFetched(data);
      },
      'get-last-message-sent-by-current-user': (data) => {
        data.cb(this.getLastSentMessageByCurrentUser(data.jid));
      },
      'get-public-url-from-thumbnail': (url, jid, cb) => {
        this.getPublicUrlFromThumbnail(url, jid, cb);
      }
    });
  }

  updateEmoticons(emoticons) {
    this.data.emoticons = emoticons;
  }

  getPublicUrlFromThumbnail(url, jid, cb) {
    let file = null;
    let fileUrl = null;
    let activeChat = this.get('chats')[jid];
    let messages = activeChat && activeChat.messages || [];

    for (let message of messages) {
      if(message.file_data && message.file_data.preview_thumbnail) {
        if(message.file_data.preview_thumbnail.src === url) {
          file = message.file_data;
          break;
        }
      }
    }

    if(file && file.is_authenticated) {
      fileUrl = file.url;
    }

    cb(fileUrl);
  }

  updateRooms(rooms) {
    var hasChanged,
        jids = _.keys(rooms),
        deleted = _.difference(_.keys(this.data.chats), jids);

    if (deleted.length) {
      this.data.chats = _.omit(this.data.chats, deleted);
      hasChanged = true;

    } else {
      _.forEach(jids, (jid) => {
        if (this.data.chats[jid]) {
          // Update Room Name
          if (this.data.chats[jid].name !== rooms[jid].name) {
            this.data.chats[jid].name = rooms[jid].name;
            hasChanged = true;
          }

          _.assign(this.data.chats[jid], rooms[jid]);

        } else {
          this.data.chats[jid] = _.assign({}, this.getChatDefaults(), {
            name: rooms[jid].name,
            jid: jid,
            active: jid === this.data.active_chat,
            last_active: new Date()
          });
          this.data.chats[jid].messages = NoMessages;
          hasChanged = true;
        }
      });
    }

    if (hasChanged) {
      this.set({
        chats: this.data.chats,
        active_chat_changed_token: {}
      });
    }
  }

  handleRoomSelect(jid) {
    var chat = this.data.chats[jid];
    if ((!chat.fully_initialized || chat.newest_mid === "")
      && !chat.has_no_message_history
      && !this.data.current_user.is_guest) {
      this.fetchXMPPHistory(jid);
    }
    this.updateMessageBounds(chat);

    let messages = chat.messages;

    // only update last read if user is switching chats
    if (jid !== this.data.active_chat) {
      chat.messages = this.updateLastReadForMessages(chat);
      this.data.active_chat = jid;
    }

    // if messages array changed then freeze it again
    if (messages !== chat.messages) {
      deepFreeze(chat.messages);
    }

    if (!chat.has_been_cleared) {
      this.checkIfEmpty(jid);
    }

    this.updateAncientHistoryMarker(jid);
    this.updateChats(jid);
  }

  updateLastReadForMessages(chat) {
    let messages = [];

    // only set last_read_indicated if last_read_message and most_recent_message are not the same
    if (_.get(chat, 'last_read_message.mid') !== _.get(chat, 'most_recent_message.mid')) {
      chat.last_read_indicated = _.clone(chat.last_read_message);
    }

    chat.messages.forEach((currentMsg, index, arr) => {
      let currentMsgTime = Number(currentMsg.ts) || Number(currentMsg.time);
      let nextMsg = arr[index + 1];
      let nextMsgTime = null;
      let lastReadIndicatedTime = _.get(chat, 'last_read_indicated.timestamp');
      if (nextMsg) {
        nextMsgTime = Number(nextMsg.ts) || Number(nextMsg.time);
      }
      // clear previous last_read_message on message
      if (_.get(currentMsg, 'last_read_message')) {
        currentMsg = patchMsg(currentMsg, { last_read_message: false });
      }
      if (lastReadIndicatedTime >= currentMsgTime &&
          nextMsg &&
          lastReadIndicatedTime < nextMsgTime) {
        // if there is an attached message update the last_read_indicated so it will appear after it
        if (_.get(nextMsg, 'attach-to.id') === currentMsg.mid) {
          chat.last_read_indicated = {
            mid: nextMsg.mid,
            timestamp: nextMsg.ts
          };
        } else {
          return messages.push(patchMsg(currentMsg, { last_read_message: true }));
        }
      }
      return messages.push(currentMsg);
    });

    return messages;
  }

  updateMessageBounds(chat) {
    if (_.isEmpty(chat.messages)) {
      this.resetMessageBounds(chat);
      return;
    }

    let messages = withoutManufacturedMessages(chat.messages);

    if (!messages.length) {
      return;
    }

    let first = _.head(messages),
        last = _.last(messages);

    _.assign(chat, {
      newest_timestamp: utils.format_time_for_history(last.time),
      newest_mid: last.mid.split('-link')[0],
      oldest_timestamp: utils.format_time_for_history(first.time),
      oldest_mid: first.mid.split('-link')[0]
    });
  }

  resetMessageBounds(chat) {
    _.assign(chat, {
      oldest_timestamp: '',
      newest_timestamp: this.getNowTimestamp(),
      oldest_mid: '',
      newest_mid: ''
    });
  }

  trimMessages(chat) {
    var messages = withoutManufacturedMessages(chat.messages),
        numMessagesToPreserve,
        numMessagesToDelete;

    if (this.chatIsBackgrounded(chat.jid)) {
      numMessagesToPreserve = getMessageCountToPreserveInBg(chat, messages);
    } else {
      numMessagesToPreserve = getMessageCountToPreserve(chat, messages);
    }
    numMessagesToDelete = messages.length - numMessagesToPreserve;

    if (numMessagesToDelete > 0) {
      let messagesToDelete = _.take(messages, numMessagesToDelete);
      return _.without(chat.messages, ...messagesToDelete);
    }

    return chat.messages;
  }

  chatIsBackgrounded(jid) {
    var chat = this.getChat(jid);
    var idleMinutesAgo = moment().subtract(appConfig.chat_room_idle_timeout_minutes, 'minutes');
    return chat && chat.jid !== this.data.active_chat && chat.last_active !== false && moment(chat.last_active).isBefore(idleMinutesAgo);
  }

  getChat(jid) {
    return this.data.chats[jid];
  }

  updateChatMessages(chats) {
    var chat;
    _.forEach(chats, (messages, jid) => {
      chat = this.data.chats[jid];
      if (chat) {
        var chat_is_backgrounded_and_empty = (jid !== this.data.active_chat && _.isEmpty(chat.messages)),

        // If the messages array is only join/leave messages, this is false
        contains_real_messages = _.reject(messages, 'is_presence_message').length;

        if ((chat.fetching_ancient || chat_is_backgrounded_and_empty) && !chat.fetching_recent) {
          _.merge(chat.ancient_msgs, messages);
          if (chat_is_backgrounded_and_empty
              && !HC.isEmbeddedComponent
              && !this.data.current_user.is_guest
              && contains_real_messages) {
            this.fetchXMPPHistory(jid);
          }
        }
        if (!(chat_is_backgrounded_and_empty && !contains_real_messages)) {
          this.addMessages(jid, _.keyBy(messages, 'mid'));
        }
      }
    });
  }

  _onPreferencesUpdated() {
    let prefsObj = {
      preferences: PreferencesStore.getAll()
    };

    //onShouldReplaceTextEmoticonsUpdated
    if (this.get('replace_text_emoticons') !== PreferencesStore.shouldReplaceTextEmoticons()){
      prefsObj['replace_text_emoticons'] = PreferencesStore.shouldReplaceTextEmoticons();
      prefsObj['chats'] = this._getFormattedChats();
    }

    //onOtherPreferencesUpdated
    prefsObj['chat_show_sidebar'] = PreferencesStore.shouldShowChatSidebar();
    prefsObj['groupchat_show_sidebar'] = PreferencesStore.shouldShowGroupChatSidebar();

    this.set(prefsObj);
  }

  _getFormattedChats() {
    let chats = _.clone(this.get('chats')),
      messages,
      formattedMessages,
      formatter = function (result, message) {
        let patchedMsg = message;

        if (hasEmoticons(message.body)) {
          patchedMsg = patchMsg(message, {
            rendered_body: utils.escapeAndLinkify(message.body, {
              do_emoticons: PreferencesStore.shouldReplaceTextEmoticons()
            })
          });
        }
        result.push(patchedMsg);

        return result;
      };

    _.forOwn(chats, function (chat, chatId) {
      messages = chat.messages;
      formattedMessages = messages ? messages.reduce(formatter, []) : [];
      chat.messages = formattedMessages;
      chats[chatId] = chat;
    });

    return chats;
  }

  removeChatMessages(jid) {
    var chat = this.data.chats[jid];

    if (chat) {
      chat.messages = NoMessages;
      chat.hasMessages = false;
      this.resetMessageBounds(chat);
      this.updateChats(jid);
    }
  }

  scheduleConfirmationFailed(chat, message) {
    if (!chat || !_.includes(['unconfirmed', 'failed'], message.status)) {
      return;
    }

    let timers = this.local.messages_timers[chat.jid] || {};
    this.local.messages_timers[chat.jid] = timers;
    let msgTimers = timers[message.mid] || {};
    timers[message.mid] = msgTimers;

    if (!msgTimers.failed_timer) {
      let delay = this.local.flaky_network_failed_timestamp ? this.local.flaky_network_failed_timestamp - utils.now() : appConfig.default_message_confirmation_timeout;

      if (!NetworkStatusHelper.isOnline() || !DAL.isConnected()) {
        // cause message to immediately fail if we are not connected/online
        delay = 0;
      }

      msgTimers.failed_timer = setTimeout(() => {
        let msg = patchMsgByMid(chat, message.mid, {status: 'failed'});
        if (msg) {
          this.cancelMessageTimers(chat.jid, message.mid);
          this.local.failed_messages.push(msg);
          this.updateChats(msg.room);
        }
      }, delay);
    }
    if (!msgTimers.flaky_timer && !this.data.honest_messages_enabled) {
      let delay = this.local.flaky_network_recoverable_timestamp ? this.local.flaky_network_recoverable_timestamp - utils.now() : appConfig.flaky_network_message_timeout;
      msgTimers.flaky_timer = setTimeout(() => {
        let msg = patchMsgByMid(chat, message.mid, {status: 'flaky'});
        if (msg) {
          this.cancelMessageTimers(chat.jid, message.mid, 'flaky_timer');
          this.updateChats(msg.room);
        }
      }, delay);
    }
  }

  cancelMessageTimers(jid, mid, timer_name) {
    let timers = this.local.messages_timers[jid];
    if (!timers) {
      return;
    }

    let msgTimers = timers[mid];
    if (!msgTimers) {
      return;
    }

    if (timer_name) {
      clearTimeout(msgTimers[timer_name]);
      msgTimers[timer_name] = undefined;
    } else {
      clearTimeout(msgTimers.failed_timer);
      clearTimeout(msgTimers.flaky_timer);
      delete timers[mid];
    }
  }

  removeFailedMessage(msg) {
    let chat = _.get(this.data, ['chats', msg.room]);
    if (!chat) {
      return;
    }
    let shouldUpdate = this.maybeRemoveMsg(chat, msg.mid);
    _.remove(this.local.failed_messages, {mid: msg.mid});

    if (shouldUpdate) {
      this.updateChats(msg.room);
    }
  }

  resendMessage(msg) {
    AppDispatcher.dispatch('resend-message', {
      text: msg.original_body || msg.body,
      jid: msg.room,
      id: msg.mid
    });

    let chat = this.data.chats[msg.room];
    if (!chat) {
      return;
    }

    //When reattempting a send on a failed message, we want to put it to the bottom of the chat
    let newTime = _.last(chat.messages).time + 1;

    patchMsgByMid(chat, msg.mid, {status: 'unconfirmed', time: newTime});
    this.scheduleConfirmationFailed(chat, msg);

    this.updateChats(msg.room);
  }

  addMessages(jid, messages) {
    let chat = this.data.chats[jid];
    if (!chat || _.isEmpty(messages)) {
      return;
    }

    chat.has_no_message_history = false;
    chat.has_been_cleared = false;
    if (this.local.should_queue_changes[jid]) {
      let queued_messages = this.local.queued_messages[jid] || {};
      this.local.queued_messages[jid] = _.merge(queued_messages, messages);
      return;
    }

    _.forEach(messages, this.scheduleConfirmationFailed.bind(this, chat));

    let currentMessages = chat.messages;

    let echoedMessages = this.filterMessages(jid, messages);
    if (echoedMessages.length) {
      chat.messages = _.without(chat.messages, ...echoedMessages);
    }

    let newMessages = _.values(messages);

    this.removeOldPresenceMessages(chat, newMessages);

    chat.messages = addNewMessages(chat.messages, newMessages, this.data.attach_reordering_enabled);

    if (this.chatIsBackgrounded(jid)) {
      chat.messages = this.trimMessages(chat);
    }

    chat.messages = this.replaceMessageContent(jid);

    let newest_mid = chat.newest_mid;

    this.updateMessageBounds(chat);

    if (jid !== this.get('active_chat') && newest_mid !== chat.newest_mid) {
      chat.should_scroll_to_bottom = true;
    }

    if (!this.chatIsBackgrounded(jid) && chat.fetching_ancient) {
      chat.messages = this.updateLastReadForMessages(chat);
    }

    // if messages array changed then freeze it again
    if (currentMessages !== chat.messages) {
      deepFreeze(chat.messages);
    }

    if (chat.fully_initialized) {
      chat.hasMessages = true;
      chat.fetching_recent = false;
      chat.fetching_ancient = false;
      this.updateChats(jid);
    }
  }

  flushQueue(jid) {
    this.local.should_queue_changes[jid] = false;
    this.addMessages(jid, this.local.queued_messages[jid]);
    this.local.queued_messages[jid] = {};
  }

  updateChats(jid) {
    if (this.data.chats[jid]) {
      var updates = {
        chats: this.data.chats,
        active_chat: this.data.active_chat
      };

      if (jid === this.data.active_chat) {
        // active_chat_changed_token is used as a proxy (checking reference equality) to know if active_chat data changed
        // and avoid re-rendering chat_panel if it didn't
        updates["active_chat_changed_token"] = {};
      }
      this.set(updates);
    }
  }

  handleUserStateMessage(data) {
    var jid = utils.jid.bare_jid(data.message.from),
        chat = this.data.chats[jid],
        user = utils.jid.bare_jid(_.get(data, 'message.delay.from_jid')) || utils.jid.bare_jid(_.get(data, 'message.from'));
    if (chat && user) {
      switch (data.type) {
      case 'active':
        if (user !== this.data.current_user.user_jid) {
          this.removeChatStateMessage(jid);
          clearTimeout(this.local.composing_timeout);
        }
        break;
      case 'composing':
        if (user !== this.data.current_user.user_jid) {
          var last_received = _.findLast(chat.messages, {mid: chat.newest_mid});
          if (!last_received || data.message.ts - last_received.ts > 1) { //don't show composing message if it's been received less than a second from the last message
            this.addChatStateMessage(jid);
            clearTimeout(this.local.composing_timeout);
            this.local.composing_timeout = setTimeout((user_jid) => {
              this.removeChatStateMessage(user_jid);
            }, appConfig.composing_message_linger_timeout, jid);
          }
        }
        break;
      default:
        break;
      }
      this.updateChats(jid);
    }
  }

  fetchAPIHistory(jid) {
    if (this.data.chats[jid] && !this.data.current_user.is_guest) {
      this.data.chats[jid].fetching = true;
      AppDispatcher.dispatch('API:fetch-recent-history', {
        params: {
          'not-before': this.data.chats[jid].newest_mid || '',
          'max-results': appConfig.message_retrieval_chunk_size
        },
        path: {
          'identifier': /@chat/.test(jid) ? utils.jid.user_id(jid) : this.data.chats[jid].id,
          'type': /@chat/.test(jid) ? 'user' : 'room'
        },
        jid: jid
      });
    }
  }

  initialJoinWithHistory(jid) {
    if (!this.data.current_user.is_guest) {
      this.data.chats[jid].fetching_ancient = true;
      this.local.should_queue_changes[jid] = true;
    }
  }

  fetchXMPPHistoryCallback(data) {

    let { from: jid, id, error } = data;

    if (!error) {
      this.handleAncientHistoryLoaded({ jid, id });
      delete this.local.history_timers[jid];
    } else {

      logger.type('fetch-history').error(jid, data.error);

      if (!this.local.history_timers[jid]){
        this.local.history_timers[jid] = {
          timer: null,
          attempts: 0
        };
      }

      if (this.local.history_timers[jid].attempts === appConfig.chat_history_fetching_attempts){
        logger.type('fetch-history').info("We are reaching max attempts for fetching history:", jid);
        return;
      }

      this.local.history_timers[jid].timer = setTimeout(() => {
        let chat = this.data.chats[jid];
        if (chat && !chat.fully_initialized){
          this.fetchXMPPHistory(jid, true);
        }
      }, appConfig.chat_history_fetching_attempt_timeout);

      this.local.history_timers[jid].attempts++;
    }
  }

  fetchXMPPHistory(jid, force_update) {
    if (this.data.current_user.is_guest) {
      return false;
    }

    AnalyticsDispatcher.dispatch('analytics-request-history', { jid });

    if (!this.data.chats[jid].fetching_ancient || force_update) {
      let oldest = this.data.chats[jid].oldest_timestamp || null,
          cb = this.fetchXMPPHistoryCallback.bind(this);

      this.data.chats[jid].oldest_mid_before_fetch = _.get(this.data.chats[jid], 'messages[0].mid', '');
      this.data.chats[jid].fetching_ancient = true;
      this.local.should_queue_changes[jid] = true;

      AppDispatcher.dispatch('request-ancient-history', { jid, oldest }, cb);
    }
  }

  handleRecentHistoryFetched(data) {
    var chat = this.data.chats[data.jid];
    if (utils.jid.is_chat(data.jid) && chat){
      chat.populated_recent = true;
      this.checkIfEmpty(data.jid);
    }
    this.updateAncientHistoryMarker(data.jid);
  }

  handleAncientHistoryLoaded(data) {
    var chat = this.data.chats[data.jid];
    if (chat) {
      var queueSize = 0;
      this.flushQueue(data.jid);
      if (_.isEmpty(chat.ancient_msgs)) {
        chat.ancient_history_is_empty = true;
      } else {
        queueSize = Object.keys(chat.ancient_msgs).length;
        chat.ancient_msgs = {};
      }
      chat.fetching_ancient = false;
      if (!chat.fully_initialized) {
        chat.fully_initialized = true;
        AppDispatcher.dispatch('chat-fully-initialized', {jid: data.jid});
      }
      this.checkIfEmpty(data.jid);
      this.updateChats(data.jid);
      AppDispatcher.dispatch('ancient-history-fetched', {});

      this.sendHistoryLoadedAnalytics({
        jid: data.jid,
        size: queueSize,
        id: _.get(this.data.chats, [data.jid, "id"])
      });

    }
  }

  sendHistoryLoadedAnalytics(data) {
    AnalyticsDispatcher.dispatch('analytics-history-loaded', data);

    // executing this action from with the then() of the uiAvailablePromise handles the corner case that the
    // chat has completed loading before the UI is available for interaction.
    uiAvailablePromise.then(() => { AnalyticsActions.handleLaunchToChatComplete(data); });
  }

  updateAncientHistoryMarker(jid) {
    var chat = this.data.chats[jid];
    if (chat && chat.messages.length >= appConfig.message_retrieval_chunk_size) {
      chat.ancient_history_is_empty = false;
    }
  }

  checkIfEmpty(jid) {
    var chat = this.data.chats[jid];
    if (chat
        && !chat.fetching_ancient
        && !chat.fetching_recent
        && _.isEmpty(chat.messages)
        && (!this.local.queued_messages[jid] || _.isEmpty(this.local.queued_messages[jid]))) {
      chat.has_no_message_history = true;
      if (!chat.fully_initialized) {
        chat.fully_initialized = true;
      }
    }
  }

  filterMessages(jid, messages) {
    let chat = this.data.chats[jid];
    let echoedMessages = [];
    _.forEach(messages, (msg) => {
      let echoedMsg = _.find(chat.messages, {mid: msg.id});
      if (echoedMsg) { // message is echo of previously sent message
        this._markEchoedMessage(jid, msg);
        echoedMessages.push(echoedMsg);
      } else if (appConfig.slash_replacement_regex.test(msg.body) && msg.id && !msg.is_history_message) {
        let replacements = this.local.replacement_messages[jid];
        let replacementIndex = _.findIndex(replacements, {mid: msg.mid});
        replacements.splice(replacementIndex, 1); // delete echoed replacement message
        delete messages[msg.mid];
      } else if (messages[msg.id]) { // echo exists in current messages set
        this._markEchoedMessage(jid, msg);
        delete messages[msg.id];
      } else if (this._wasMessagesAlreadyEchoed(jid, msg)) { // echo has already been received
        this._markEchoedMessage(jid, msg);
        delete messages[msg.mid];
      } else if (jid === utils.jid.bare_jid(msg.from)) {
        chat.is_composing = false;
        clearTimeout(this.local.composing_timeout);
      }
    });

    return echoedMessages;
  }

  _wasMessagesAlreadyEchoed(jid, msg) {
    return this.local.echoed_chats[jid] && this.local.echoed_chats[jid].messages[msg.id];
  }

  _markEchoedMessage(jid, msg) {
    this.cancelMessageTimers(jid, msg.id);
    msg.is_echo = true;

    let falseFailedMsg = _.findIndex(this.local.failed_messages, {mid: msg.id});

    if (falseFailedMsg !== -1) {
      this.local.failed_messages.splice(falseFailedMsg, 1);
    }

    if (!this.local.echoed_chats[jid]) {
      this.local.echoed_chats[jid] = {messages: {}};
    }
    this.local.echoed_chats[jid].messages[msg.id] = msg;
  }

  addChatStateMessage(jid) {
    if (!this.data.chats[jid].is_composing){
      if (jid === this.data.active_chat) {
        this.smoothChangeChatStateMessage(jid, true);
      }
      this.data.chats[jid].is_composing = true;
    }
  }

  removeChatStateMessage(jid) {
    if (this.data.chats[jid].is_composing){
      if (jid === this.data.active_chat) {
        this.smoothChangeChatStateMessage(jid, false);
      } else {
        this.data.chats[jid].is_composing = false;
      }
    }
  }

  smoothChangeChatStateMessage(jid, isComposing) {
    this.local.should_queue_changes[jid] = true;
    let action = isComposing ? 'add' : 'remove';
    let promise = new Promise((res) => {
      setTimeout(() => {
        res(jid);
      }, appConfig.chat_scroll_duration);
      AppDispatcher.dispatch(`${action}-chat-state-message`, {jid: jid});
    });

    promise.then((chat_jid) => {
      this.data.chats[chat_jid].is_composing = isComposing;
      this.flushQueue(chat_jid);
      this.updateChats(chat_jid);
    });
  }

  replaceMessageContent(jid) {
    let replacements = this.local.replacement_messages[jid];

    let messages = this.data.chats[jid].messages;

    if (_.isEmpty(replacements)) {
      return messages;
    }

    messages = _.clone(messages);

    replacements.forEach(function (replacementMsg) {
      // remove replacement messages from message array
      let pos = _.findLastIndex(messages, {mid: replacementMsg.mid});
      if (pos > -1) {
        messages.splice(pos, 1);
      }

      // replacements for ninja edit
      pos = _.findLastIndex(messages, function (entry) {
        return entry.time <= replacementMsg.time && String(entry.sender_id) === String(replacementMsg.sender_id);
      });
      if (pos > -1 && !replacementMsg.edited_message) {
        let oldMsg = messages[pos];

        let newBody;

        // If the message is an emote, re-apply the emote replacement (as we don't
        // persist the replacement on the message directly).
        if (oldMsg.isEmote) {
          let emote = oldMsg.body.slice(0, 3);
          let emoteMessage = oldMsg.body.slice(3);
          newBody = emoteMessage.replace(replacementMsg.text_to_replace, replacementMsg.replacement_text);
          newBody = utils.replaceEmoteMessage(emote + newBody, oldMsg.sender);
        } else {
          newBody = oldMsg.body.replace(replacementMsg.text_to_replace, replacementMsg.replacement_text);
        }

        let newMsg = patchMsg(oldMsg, {body: newBody});
        utils.formatMessageBody(newMsg);
        messages.splice(pos, 1, newMsg);
      }

      // replacements for new message edit
      pos = _.findIndex(messages, {mid: _.get(replacementMsg,'replace.id')});
      if ( (pos > -1 && replacementMsg.edited_message) || (pos > -1 && replacementMsg.is_deleted) ) {
        let patchObj = {
          body: replacementMsg.edited_message,
          replace: replacementMsg.replace,
          is_deleted: replacementMsg.is_deleted
        };
        if (_.get(messages[pos],'file_data.desc', false)) {
          patchObj['file_data'] = {
            desc: replacementMsg.edited_message,
            is_deleted: replacementMsg.is_deleted
          };
        }
        let newMsg = patchMsg(messages[pos], patchObj);
        utils.formatMessageBody(newMsg);
        messages.splice(pos, 1, newMsg);
      }
    });

    this.local.replacement_messages[jid].length = 0;

    return _.sortBy(messages, "time");
  }

  toggleImage(jid, mid) {
    let chat = this.data.chats[jid],
        origMsg;

    if (chat && chat.messages) {
      origMsg = _.find(chat.messages, (msg) => {
        return msg.mid === mid;
      });

      if (origMsg) {
        let collapsed = !!origMsg.is_collapsed;
        patchMsgByMid(chat, mid, {is_collapsed: !collapsed});
        this.updateChats(jid);
      }
    }
  }

  toggleAttachedCards(anchor_mid) {
    let chat = this.data.chats[this.data.active_chat],
      origMsg;

    if (chat && chat.messages) {
      origMsg = _.find(chat.messages, (msg) => {
        return msg.mid === anchor_mid;
      });

      if (origMsg) {
        let collapsedDefault = PreferencesStore.shouldHideAttachedCardsByDefault();
        let collapsed = utils.isAttachedCardsCollapsed(origMsg, collapsedDefault);
        patchMsgByMid(chat, anchor_mid, {is_attached_cards_collapsed: !collapsed});
        this.updateChats(this.data.active_chat);
      }
    }
    this.updateChats(this.data.active_chat);
  }

  getLastSentMessageByCurrentUser(jid) {
    let editableTypes = {
      'message': true,
      'file': true
    };
    let lastMessages = _.filter(this.data.chats[jid].messages, (msg) => {
      let current_user_id = utils.jid.user_id(this.data.current_user.user_jid);
      return msg.sender_id === current_user_id && editableTypes[msg.type];
    });
    return _.last(_.sortBy(lastMessages, "time"));
  }

  removeOldPresenceMessages(chat, new_messages) {
    if (!_.isObject(chat) || !_.isArray(new_messages)) {
      return true;
    }

    let user_jids = new_messages.reduce(function (prev, curr) {
      if (curr.is_presence_message && curr.user_jid) {
        prev.push(curr.user_jid);
      }
      return prev;
    }, []);

    if (user_jids.length && _.isArray(chat.messages)) {
      let old_presence_messages = chat.messages.filter((message) => message.is_presence_message && _.includes(user_jids, message.user_jid));

      old_presence_messages.forEach((msg) => this.maybeRemoveMsg(chat, msg.mid));
    }
  }

  maybeRemoveMsg(chat, mid) {
    var pos = _.findIndex(chat.messages, {mid});
    if (pos === -1) {
      return false;
    }

    let messages = _.clone(chat.messages);
    messages.splice(pos, 1);
    deepFreeze(messages);

    chat.messages = messages;

    return true;
  }

}

export default new ChatWindowStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/chat_window_store.js
 **/