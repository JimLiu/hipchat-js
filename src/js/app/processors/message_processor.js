import utils from 'helpers/utils';
import link_utils from "helpers/link_utils";
import logger from 'helpers/logger';
import moment from 'moment';
import notifier from 'helpers/notifier';
import PreferencesStore from 'stores/preferences_store';
import File from 'core/models/file';
import AppDispatcher from 'dispatchers/app_dispatcher';
import AppActions from 'actions/app_actions';
import AppConfig from 'config/app_config';
import ChatPanelStrings from 'strings/chat_panel_strings';
import VideoCallStrings from 'strings/video_call_strings';
import IntegrationHelper from 'helpers/integration_helper';
import {MESSAGE_RECEIVED} from "api/api_integration_events";

class MessageProcessor {

  constructor(store) {
    this.store = store;
    this.update();
    this.registerEventCallbacks();
    this.ready = false;
    this.queued = [];
    this.imagesQueue = [];
    this._debouncedFetchQueue = _.debounce(this._fetchQueue.bind(this), 500, {
      leading: true,
      trailing: true
    });
  }

  update() {
    this.setPredicates();
    this.updateNotifier();
  }

  setPredicates() {
    this.outgoing_message_predicate = utils.createSafePredicate(AppConfig.outgoing_message_filter_predicate, AppConfig);
    utils.formatMessageBody = this.formatMessageBody.bind(this);
  }

  configure(asset_base_uri) {
    this.asset_base_uri = asset_base_uri;
  }

  updateNotifier() {
    notifier.update({
      group_name: this.store.get("group_name"),
      feature_flags: _.get(this.store.get("config"), "feature_flags", {})
    });
  }

  registerEventCallbacks() {
    AppDispatcher.registerOnce('app-state-ready', () => {
      this.ready = true;
      this.processMessages(this.queued);
      this.queued = [];
    });
    AppDispatcher.register({
      'application-blurred': () => {
        this.appBlurred = true;
      },
      'application-focused': () => {
        this.appBlurred = false;
      }
    });
  }

  getMentionArguments() {
    var mentionRegexMe = this.convertRegex(this.store.get("mentionRegexMe"), "mentionRegexMe");
    var mentionRegexUser = this.convertRegex(this.store.get("mentionRegexUser"), "mentionRegexUser");
    return {
      name_tag_regex: mentionRegexMe,
      mention_regex: mentionRegexUser,
      matches: [],
      do_escape: false,
      do_linkify: false,
      do_mentions: true
    };
  }

  convertRegex(regex, key) {
    var flag = (key === "mentionRegexUser") ? "ig" : "g";
    if (typeof regex === 'string') {
      return new RegExp(regex.substring(1, regex.lastIndexOf(')') + 1), flag);
    }
    return regex;
  }

  processMessages(messages) {
    let msgArray = utils.toArray(messages);
    if (!this.ready && !messages.results) {
      this.queued = this.queued.concat(msgArray);
    } else {
      var messagesObj = {};
      if (messages.jid && messages.results) {
        messagesObj = this.formatAPIMessages(messages);
      } else {
        messagesObj = this.formatXMPPMessages(messages);
      }
      return messagesObj;
    }
  }

  formatXMPPMessages(messages) {
    var messagesObj = {},
        jid,
        sender;

    // Filter messages
    messages = this.filterMessages(utils.toArray(messages));

    _.forEach(messages, (message) => {
      jid = utils.jid.bare_jid(message.from);

      if (this.checkMessageForAction(message, jid)) {
        return;
      }
      this.setMessageTypeAndFormat(message);

      if (typeof message.mid === 'undefined') {
        message.mid = _.uniqueId();
      }
      if (typeof message.ts === 'undefined') {
        message.ts = utils.getMoment();
      }

      if (typeof message.subject !== 'undefined') {
        if (message.delay) { //We don't want previous topic change messages to change the room topic
          return;
        }
        sender = this.getMessageSender(message);
        if (!sender) {
          return;
        }

        var topicChangeMsg = this.handleTopicChange(message, sender, jid);

        _.assign(message, topicChangeMsg);
      }

      var sender_id = this.getMessageSenderId(message),
          sender_name = this.getMessageSender(message),
          current_user = this.store.get("current_user");

      _.assign(message, {
        room: jid,
        sender: message.sender || sender_name,
        sender_id: sender_id,
        sender_is_current_user: sender_id === current_user.user_id,
        date: moment.unix(message.ts).toISOString(),
        sender_mention: message.sender_mention || this.getMessageSenderMention(message),
        sender_avatar: message.sender_avatar || this.getAvatar(sender_id),
        display_time: this.formatDate(message.ts),
        time: parseFloat(message.ts),
        is_history_message: utils.isHistoryMessage(message),
        status: 'confirmed'
      });

      this.setMessageColor(message);
      message.card = this.processCard(_.get(message, "x.card.raw", false));
      this.setMessageSenderAndAvatar(message, _.get(message, 'x.notification_sender', false));
      this.processMessageMetadata(message);

      message = this.formatMessageBody(message);

      if (message.body && !utils.isHistoryMessage(message) && this.shouldNotify(message)) {
        sender = message.sender || this.getMessageSender(message);
        this.updateNotifier();
        AppActions.showNotification({
          jid: jid,
          group_id: this.store.get("group_id"),
          group_name: this.store.get("group_name"),
          title: this.getNotificationTitle(message.room, sender),
          body: this.getNotificationBody(message, sender),
          icon: this.asset_base_uri + AppConfig.notification_icon,
          html_body: message.format === 'html' ? message.xhtml_im_body : message.rendered_body
        });
        notifier.playSound('notification');
      }

      messagesObj[message.mid] = message;

      var escapeAndLinkifyOptions = {
        do_emoticons: PreferencesStore.shouldReplaceTextEmoticons()
      };

      if (_.filter(message.x, 'metadata').length) {
        var meta = _.compact(_.map(message.x, 'metadata'))[0];
        if (meta.type === "info") {
          _.assign(message, {
            sender: utils.getSenderFromMeta(meta.type),
            sender_id: sender_id,
            sender_mention: "",
            color: 'gray'
          });
        } else {
          var mid = message.mid || '',
            msg = {},
            time = parseFloat(message.ts);

          _.assign(msg, {
            room: jid,
            mid: mid + '-link-1',
            sender: utils.getSenderFromMeta(meta.type),
            sender_id: sender_id,
            sender_mention: message.sender_mention || this.getMessageSenderMention(message),
            sender_avatar: this.getAvatar(sender_id),
            date: moment.unix(time).toISOString(),
            display_time: this.formatDate(time + 1),
            time: time,
            format: 'html',
            body: meta.text ? utils.escapeAndLinkify(meta.text, escapeAndLinkifyOptions) : '',
            type: meta.type,
            link_details: meta,
            color: 'gray',
            is_history_message: utils.isHistoryMessage(message)
          });
          msg.link_details = _.transform(msg.link_details, (result, val, key) => {
            result[utils.camelToSnake(key)] = val;
          });

          if (meta.type === 'image' && !meta.mp4) {
            this._processImageMessage(meta, msg);
          } else {
            messagesObj[msg.mid] = _.clone(msg);
          }
        }
      }
    });
    return messagesObj;
  }

  /**
   * Method for preparing image for image link message
   * @param meta
   * @param msg
   * @private
   */
  _processImageMessage(meta, msg) {
    this.imagesQueue.push({ url: meta.image, msg });
    this._debouncedFetchQueue((imgMsg, image) => {
      AppDispatcher.dispatch('fetch-attachment-image', {
        [imgMsg.mid]: imgMsg
      });
    });
  }

  /**
   * Fetching queue of images
   * @param {Func<Object,Image>} iteratee - callback
   * @param {Array<Object>} queue - url queue to be fetched
   * @private
   */
  _fetchQueue(iteratee = _.noop, queue = _.clone(this.imagesQueue).reverse()) {
    this.imagesQueue = [];
    this._recurQueue(queue, iteratee);
  }

  /**
   * Applying promisified fetchImage recursively against the queue
   * @param {Array} queue
   * @param {Func<Object,Image} iteratee - callback
   * @private
   */
  _recurQueue(queue, iteratee) {
    let [head, ...rest] = queue;
    let promise = this._fetchImage(head.url);

    promise.then((image) => {
      iteratee(head.msg, image);

      if (rest.length !== 0) {
        this._recurQueue(rest, iteratee);
      }
    }, (err) => {
      logger.error(err.message, err);

      if (rest.length !== 0) {
        this._recurQueue(rest, iteratee);
      }
    });
  }

  /**
   * Fetching image
   * @param url
   * @returns {Promise{Image}
   * @private
   */
  _fetchImage(url) {
    return new Promise((resolve, reject) => {
      let image = new Image();
      let timeoutId;

      image.onload = () => {
        clearTimeout(timeoutId);

        if (image.naturalWidth > AppConfig.message_image_max_size ||
            image.naturalHeight > AppConfig.message_image_max_size) {
          reject(new Error('Image is too large'));
        }

        resolve(image);
      };

      image.onerror = (err) => {
        clearTimeout(timeoutId);
      };

      timeoutId = setTimeout(() => {
        image.src = '';
        clearTimeout(timeoutId);
        reject(new Error('Fetching timeout'));
      }, AppConfig.message_image_loading_timeout);

      image.src = url;
    });
  }

  filterMessages(msgs) {
    let predicate = utils.createSafePredicate(AppConfig.message_filter_predicate, AppConfig);

    msgs = _.filter(msgs, msg => _.has(msg, 'body') ? !_.isEmpty(msg.body) || !!msg.replace : true);
    return _.filter(msgs, predicate);
  }

  formatDate(date) {
    return utils.format_time(date, PreferencesStore.shouldUse24HrTime());
  }

  formatAPIMessages(messages) {
    var temp = {},
      transformed_messages;

    transformed_messages = _.transform(messages.results, (result, msg) => {
      if (msg.type === 'topic') {
        return;
      }
      if (this.isEnsoVideoHistoryMessage(msg)) {
        return;
      }
      // HC-31099: Deleted messages come back from Coral with null message bodies (ohcrap)
      if (_.isNull(msg.message)) {
        return;
      }

      let sender_name = msg.from.name || msg.from;

      temp = {
        body: msg.message,
        room: messages.jid,
        mid: msg.id,
        time: utils.getMoment(msg.date),
        display_time: this.formatDate(msg.date),
        date: moment(msg.date).toISOString(),
        from: messages.jid,
        sender: sender_name,
        sender_mention: msg.from.mention_name,
        sender_id: msg.from.id,
        sender_avatar: this.getAvatar(msg.from.id),
        type: msg.type === 'unknown' || !msg.type ? 'message' : msg.type,
        color: msg.color,
        format: msg.message_format,
        card: this.processCard(_.get(msg, "card", false)),
        is_history_message: true,
        status: 'confirmed'
      };

      if (msg.message_format === 'html') {
        temp.xhtml_im_body = msg.message;
      }

      if (msg.authenticated_file) {
        _.assign(temp, {
          type: 'file',
          authenticated_file: msg.authenticated_file
        });
      } else if (msg.file) {
        _.assign(temp, {
          type: 'file',
          file: msg.file
        });
      }

      if (AppConfig.slash_replacement_regex.test(msg.message)) {
        var arr = msg.message.split('/');
        AppDispatcher.dispatch('replacement-message-received', {
          jid: messages.jid,
          sender_id: msg.from.id,
          text_to_replace: arr[1],
          replacement_text: arr[2],
          time: utils.getMoment(msg.date),
          mid: msg.id
        });
      }

      this.setMessageTypeAndFormat(temp);
      this.setMessageColor(temp);
      this.setMessageSenderAndAvatar(temp, _.get(msg, 'notification_sender', false));
      this.processMessageMetadata(temp);
      result.push(this.formatMessageBody(temp));

      if (msg.message_links && msg.message_links.length) {
        var linkMsg = {},
          index = 0;
        _.map(msg.message_links, (link) => {
          index++;
          linkMsg = {
            room: messages.jid,
            mid: link.id || msg.id + '-link-' + index,
            body: link[link.type].text || msg.message,
            time: utils.getMoment(msg.date) + index,
            date: moment(msg.date).toISOString(),
            display_time: this.formatDate(msg.date),
            from: messages.jid,
            sender: utils.getSenderFromMeta(link.type),
            sender_mention: msg.from.mention_name,
            sender_id: msg.from.id,
            format: 'html',
            color: 'gray',
            type: link.type,
            link_details: link[link.type],
            is_history_message: true,
            status: 'confirmed'
          };
          linkMsg.link_details['url'] = link.url;
          linkMsg.link_details = _.transform(linkMsg.link_details, (transform_result, val, key) => {
            transform_result[utils.camelToSnake(key)] = val;
          });
          result.push(linkMsg);
        });
      }
    });

    transformed_messages = _.reject(transformed_messages, (msg) => {
      return msg.mid.split('-link-')[0] === messages.mid ||
        (_.has(msg, 'message') && _.isNull(msg.message));
    });

    if (transformed_messages.length) {
      return _.keyBy(transformed_messages, 'mid');
    }
  }

  processSentMessage(data) {
    var msgObj = {},
      currentUser = this.store.get("current_user"),
      sender_id = utils.jid.user_id(currentUser.user_jid),
      msg = {
        jid: data.jid,
        room: data.jid,
        from: currentUser.user_jid,
        sender: currentUser.user_name,
        sender_id: sender_id,
        sender_avatar: this.getAvatar(sender_id),
        display_time: this.formatDate(),
        color: 'blue',
        time: data.time,
        body: data.text,
        type: 'message',
        mid: data.id.toString(),
        status: this.outgoing_message_predicate(data) ? 'unconfirmed' : 'confirmed',
        is_user_sent: true
      };
    if (this.checkMessageForAction(msg, data.jid)) {
      return undefined;
    }
    this.setMessageTypeAndFormat(msg);
    msg = this.formatMessageBody(msg);
    msg['sender_mention'] = this.getMessageSenderMention(msg);
    msgObj[msg.mid] = msg;
    return msgObj;
  }

  handleTopicChange(message, sender, jid) {
    var subject = message.subject.substring(0, AppConfig.max_topic_text_length), // Truncate topics that come from server
      currentUser = this.store.get("current_user"),
      msg = {
        sender: ' ',
        type: "info",
        color: (sender === currentUser.user_name) ? "blue" : "nocolor",
        body: (subject.length) ? ChatPanelStrings.topic_message(sender, subject) : ChatPanelStrings.clear_topic_message(sender)
      };

    AppDispatcher.dispatch("DAL:handle-topic-updated", {
      topic: subject,
      jid: jid
    });

    return msg;
  }

  formatMessageBody(message) {
    var type = /message$/.test(message.type) ? 'message' : message.type,
      text = message.body,
      do_escape = true;

    if (typeof text === 'string') {
      do_escape = ['html', 'code', 'quotation', 'monospace'].indexOf(message.format) === -1;
      if (message.x) {
        message.x = utils.toArray(message.x);
      }

      if (type === 'message' && text.match(AppConfig.emote_regex)) {
        message.type = 'info';
        message.isEmote = true;
        text = utils.replaceEmoteMessage(text, message.sender);
      }

      if (message.type === 'file') {
        let file = File.fromMessageObject(message);
        message.file_data = file;
        text = file.desc;
      }

      // Check for monospace formatting (remove excess whitespace)
      if (message.format === 'quotation') {
        text = utils.formatMultilineBlock(text);
      }

      // Escape html and linkify
      var matches = [];
      var isFormatted = (this.isQuoteMessage(message) || this.isCodeMessage(message) || this.isMonospaceMessage(message));

      // Don't linkify if we're going to truncate a pasted block by # of characters
      // (links are fine if we're truncating by line)
      var do_linkify = (do_escape && !isFormatted);
      var do_emoticons = (do_escape && !isFormatted && PreferencesStore.shouldReplaceTextEmoticons());
      var do_mentions = (do_escape && !isFormatted && utils.jid.is_room(message.room));
      var do_hex_colors = (do_escape && !isFormatted);
      var do_word_breaks = do_escape;
      var mentionRegexMe = this.convertRegex(this.store.get("mentionRegexMe"), "mentionRegexMe");
      var mentionRegexUser = this.convertRegex(this.store.get("mentionRegexUser"), "mentionRegexUser");
      var guestRegexUser = this.convertRegex(this.store.get("guestRegexUser"), "guestRegexUser");
      var emoticons = this.store.get("emoticons");

      text = utils.escapeAndLinkify(text, {
        escape_whitespace: do_escape,
        name_tag_regex: mentionRegexMe,
        mention_regex: mentionRegexUser,
        guest_regex: guestRegexUser,
        matches: matches,
        emoticon_path: emoticons.path_prefix,
        do_escape: do_escape,
        do_linkify: do_linkify,
        do_emoticons: do_emoticons,
        do_word_breaks: do_word_breaks,
        do_mentions: do_mentions,
        do_hex_colors: do_hex_colors
      });

      message.rendered_body = text;
      message.message_type = type;
      if (message.format === 'html' && message.xhtml_im_body) {
        message.xhtml_im_body = this.substituteMentionTagsForHtml(message.xhtml_im_body);
      }
    }
    return message;
  }

  getNotificationBody(message, sender) {
    var body;

    if (message.type === "message") {
      body = (message.body) ? message.body : ChatPanelStrings.generic_message(sender);
    } else if (message.type === "file") {
      if (message.body) {
        body = message.body;
      } else if (_.get(message, "file_data.name")) {
        var file_name = utils.file.get_file_name(message.file_data.name);
        body = ChatPanelStrings.generic_file_uploaded_message(sender, file_name);
      } else {
        body = ChatPanelStrings.generic_file_message(sender);
      }
    }
    return body || ChatPanelStrings.generic_message(sender);
  }

  getNotificationTitle(room_jid, sender) {
    let room = this.store.get("activeRooms")[room_jid] || this.store.get("allRooms")[room_jid],
      room_name = _.get(room, 'name'),
      is_from_room = utils.jid.is_room(room_jid),
      title;

    if (is_from_room) {
      title = this.getRoomNotificationTitle(room_name, sender);
    } else {
      title = this.getOTONotificationTitle(sender);
    }
    return title;
  }

  getRoomNotificationTitle(room_name, sender) {
    return ChatPanelStrings.room_notification_title(sender, room_name);
  }

  getOTONotificationTitle(sender) {
    return ChatPanelStrings.oto_notification_title(sender);
  }

  shouldNotify(message) {
    var preferences = PreferencesStore.getAll(),
      current_user = this.store.get("current_user"),
      roster = this.store.get("roster"),
      current_user_roster_entry = roster[current_user.user_jid],
      overrides,
      roomOverrides,
      notification_level;

    // Do not notify if current user is DND
    if (!preferences.notifyWhenDND && current_user_roster_entry && _.get(current_user_roster_entry, "presence.show") === "dnd") {
      return false;
    }

    // Do not notify for info messages
    if (message.type && message.type === "info") {
      return false;
    }

    // Do not notify for s/ messages
    if (AppConfig.slash_replacement_regex.test(message.body)) {
      return false;
    }

    // Do not notify if message is from the current user
    if (this.getMessageSenderId(message) === current_user.user_id) {
      return false;
    }

    // Do not notify if app is focused and message is for the active chat
    if (!this.appBlurred && this.store.get("active_chat") === message.room) {
      return false;
    }

    // Private chats are the only ones that have a setting that take precedence over the globalNotificationSetting
    if (utils.jid.is_private_chat(message.room)) {
      return preferences.notifyForPrivate;
    }

    // See if this room has an override, else use the global setting
    overrides = preferences.roomNotificationOverrides || {};
    roomOverrides = overrides[message.room] || {};
    notification_level = _.get(roomOverrides, "level", PreferencesStore.getGlobalNotificationSetting());

    if (message.x) {
      const x = _.head(utils.toArray(message.x));
      const notify = _.get(x, 'notify');
      const type = _.get(x, 'type');
      const hasMention = message.body.search(this.store.get('mentionRegexMe')) !== -1;

      if (notify === '0' && (type !== 'system' || !hasMention)) {
        return false;
      }
    }

    return this.shouldNotifyForLevel(notification_level, message);
  }

  shouldNotifyForLevel(level, message) {
    const isFormatted = utils.isFormattedMessage(message);

    const hasJustMeMention = message.body.search(this.store.get('mentionRegexJustMe')) !== -1;
    const hasMention = message.body.search(this.store.get('mentionRegexMe')) !== -1;

    switch (level) {
      case "quiet":
        return !isFormatted && hasJustMeMention;
      case "normal":
        return !isFormatted && hasMention;
      case "loud":
        return true;
      default:
        return false;
    }
  }

  getMessageSenderObject(message) {
    let jid,
      name,
      sender = {},
      roster = this.store.get('roster');

    // If history message, use from_jid in delay node as it is first source of truth
    if (message.delay && message.delay.from_jid) {
      jid = utils.jid.bare_jid(message.delay.from_jid);

      // Fallback if the sender name is not defined
      sender = roster[jid] || {
          id: utils.jid.user_id(jid),
          name: utils.jid.resource(message.from)
      };

    // If message.from is a user's jid, use it
    } else if (utils.jid.is_private_chat(message.from)) {
      jid = utils.jid.bare_jid(message.from);
      sender = roster[jid] || { id: utils.jid.user_id(jid) };

    // That leaves room messages. First, prefer from_jid if available (will not exist
    // in older BTF servers
    } else if (message.from_jid) {
      jid = utils.jid.bare_jid(message.from_jid);
      sender = roster[jid] || { id: utils.jid.user_id(jid) };

    // Finally, fallback to using the resource part of the from property
    // This is prone to a security hole in which a user can impersonate another
    // by using the same full name -- but should only be applicable for BTF instances
    // where from_jid is not yet supported
    } else if (message.from) {
      name = utils.jid.resource(message.from);
      sender = _.find(roster, { name }) || { name };
    }
    return {
      name: sender.name ? sender.name : '',
      mention_name: sender.mention_name ? sender.mention_name : '',
      id: sender.id ? parseInt(sender.id, 10) : null
    };
  }

  getMessageSender(message) {
    if (message.type === 'link') {
      return 'Link';
    }
    return this.getMessageSenderObject(message).name;
  }

  getMessageSenderId(message) {
    return this.getMessageSenderObject(message).id;
  }

  getMessageSenderMention(message) {
    return this.getMessageSenderObject(message).mention_name;
  }

  updateMessagesIfGuestsConnected(messages) {
    _.forEach(messages, (message) => {
      if (!message.sender_mention) {
        message.sender_mention = this.getMessageSenderMention(message);
      }
      this.formatMessageBody(message);
    });
  }

  checkMessageForAction(message, jid) {
    var extra,
      status = _.intersection(_.keys(message), this.store.local.chat_states),
      active_rooms = this.store.get("activeRooms"),
      current_user = this.store.get("current_user");

    extra = message.x ? utils.toArray(message.x) : [{}];

    let is_video_message = (_.includes(['http://hipchat.com/protocol/enso', 'http://hipchat.com/protocol/addlive'], extra[0].xmlns) && !utils.isHistoryMessage(message));

    if (is_video_message) {
      return this.handleCallMessage(message, extra[0], extra[0].xmlns.split('/').pop());
    } else if (message.type === 'error') {
      logger.warn(message);
      AppDispatcher.dispatch('error-message-received', message);
      return true;
    } else if (message.html && message.xhtml_im_body && !message.authenticated_file) {
      let $markup = $('<div/>').append(utils.getFixedHtml(message.xhtml_im_body)),
        $link = $('a[data-target-options="enso_invite"]', $markup);
      if ($link.length) {
        return true;
      }
    } else if (message.authenticated_file || message.file || extra[0].file) {

      // Open OTO chat if chat is not open
      if (this.isOneToOneChatClosed(message, jid, active_rooms)) {
        AppDispatcher.dispatch('private-chat-invite-received', message);
      }

      this.addFile(jid, message);
      return false;

    } else if (message.replace) {
      AppDispatcher.dispatch('replacement-message-received', {
        jid: jid,
        edited_message: message.body,
        mid: message.mid,
        replace: message.replace,
        is_deleted: message.replace && message.body === ""
      });
    } else if (message.x
      && message.x.is_archived
      && !message.body
      && !utils.isHistoryMessage(message)) {
      if (parseInt(message.x.is_archived)) {
        AppDispatcher.dispatch('room-archived', {jid: jid});
      } else if (!parseInt(message.x.is_archived)) {
        AppDispatcher.dispatch('room-unarchived', {jid: jid});
      }
      return false;
    } else if (this.isCodeMessage(message) || this.isQuoteMessage(message) || this.isMonospaceMessage(message)) {

      if (this.isOneToOneChatClosed(message, jid, active_rooms)) {
        AppDispatcher.dispatch('private-chat-invite-received', message);
      }
      return false;
    } else if (!extra[0].file
      && extra[0].type !== "system"
      && active_rooms[jid]
      && message.body
      && message.body.length
      && link_utils.get_urls_from_string(message.body)) {

      this.addLinks(jid, message);
      return false;

    } else if (status.length
      && (!message.body || message.body.length === 0)) {
      status = _.head(status);
      AppDispatcher.dispatch('status-message-received', {
        type: status,
        message: message
      });
      return true;
    } else if (AppConfig.slash_replacement_regex.test(message.body)) {
      var arr = message.body.split('/');
      AppDispatcher.dispatch('replacement-message-received', {
        jid: jid,
        sender_id: this.getMessageSenderId(message),
        text_to_replace: arr[1],
        replacement_text: arr[2],
        time: message.time || parseFloat(message.ts),
        mid: message.mid
      });
      return false;
    } else if (extra[0].invite) {
      var from = _.get(extra[0], 'invite.from', false);
      if (from && (utils.jid.bare_jid(from) === current_user.user_jid)) {
        var fromRoom = utils.jid.bare_jid(message.from);
        AppDispatcher.dispatch('open-room', {
          jid: fromRoom,
          dontSelectRoom: true
        });
      } else {
        let cb = function (err, room) {
          if (room) {
            AppDispatcher.dispatch('handle-cached-room', {
              jid: room.jid,
              name: room.name,
              x: room
            });
          } else {
            logger.error(['fetch-room'], err.message);
          }
          AppDispatcher.dispatch('groupchat-invite-received', message);
        };
        AppDispatcher.dispatch('fetch-room', message.from, cb);
      }
      return true;

    } else if (this.isOneToOneChatClosed(message, jid, active_rooms)
      && message.body
      && message.body.length > 0) {
      AppDispatcher.dispatch('private-chat-invite-received', message);
      return false;

    } else if (typeof extra[0].guest_url !== 'undefined' && !utils.isHistoryMessage(message)) {
      AppDispatcher.dispatch('guest-access-changed', {
        jid: jid,
        url: extra[0].guest_url
      });
      return false;
    }
  }

  handleCallMessage(message, extra, service) {
    var evt_map = {
        call: 'invite-to-audio-video-call',
        accept: 'audio-video-call-accepted',
        decline: 'audio-video-call-declined',
        hangup: 'audio-video-call-hung-up'
      },
      sender = {
        jid: message.from,
        id: this.getMessageSenderId(message),
        name: this.getMessageSender(message)
      },
      current_user = this.store.get("current_user"),
      commonKeys = _.intersection(_.keys(extra), _.keys(evt_map)),
      type = _.head(commonKeys),
      evt = evt_map[type];
    if (message.type === 'error' && service === VideoCallStrings.ENSO) {
      _.assign(message, {
        body: _.get(message, 'error.text', '').toString(),
        from: 'HipChat',
        sender: utils.getSenderFromMeta(),
        type: 'system',
        color: 'gray'
      });
      return !message.body;
    } else if (evt && message.from !== current_user.user_jid || evt === 'audio-video-hangup') {
      AppDispatcher.dispatch(`${service}.${evt}`, {
        message: message,
        sender: sender
      });
    }
    return true;
  }

  setMessageColor(message) {
    var current_user = this.store.get("current_user");

    if (message.color || (message.x && message.x.color)) {
      message.color = message.color || message.x.color;
    } else if (message.sender_id === current_user.user_id
      || (message.delay && message.delay.from_jid === current_user.user_jid)
      || (current_user.is_guest && message.sender_mention === current_user.mention)) {
      message.color = 'blue';
    } else if (message.type === 'notification') {
      message.color = 'gray';
    } else {
      message.color = 'nocolor';
    }
  }

  isQuoteMessage(message) {
    if (_.get(message, 'format') === 'quotation') {
      return true;
    }

    let formatIsText = false,
        messageFormat = _.get(message, 'x.message_format'),
        matchesRegex = AppConfig.quote_regex.test(message.body);

    if (_.isUndefined(messageFormat) || messageFormat === 'text') {
      formatIsText = true;
    }

    return formatIsText && matchesRegex;
  }

  isCodeMessage(message) {
    if (_.get(message, 'format') === 'code') {
      return true;
    }

    let formatIsText = false,
        messageFormat = _.get(message, 'x.message_format'),
        matchesRegex = AppConfig.code_regex.test(message.body);

    if (_.isUndefined(messageFormat) || messageFormat === 'text') {
      formatIsText = true;
    }

    return formatIsText && matchesRegex;
  }

  isMonospaceMessage(message) {
    if (_.get(message, 'format') === 'monospace') {
      return true;
    }

    let formatIsText = false,
        messageFormat = _.get(message, 'x.message_format'),
        matchesRegex = AppConfig.pre_regex.test(message.body);

    if (_.isUndefined(messageFormat) || messageFormat === 'text') {
      formatIsText = true;
    }

    return formatIsText && matchesRegex;
  }

  formatQuoteMessage(message) {
    _.assign(message, {
      original_body: message.body,
      body: message.body.replace(AppConfig.quote_regex, ''),
      format: 'quotation'
    });
  }

  formatCodeMessage(message) {
    _.assign(message, {
      original_body: message.body,
      body: message.body.replace(AppConfig.code_regex, ''),
      format: 'code'
    });
  }

  formatMonospaceMessage(message) {
    _.assign(message, {
      original_body: message.body,
      body: message.body.replace(AppConfig.pre_regex, ''),
      format: 'monospace'
    });
  }

  setMessageTypeAndFormat(message) {
    var type = message.x ? _.compact(_.map(utils.toArray(message.x), 'type'))[0] : message.type,
      format = message.x ? _.compact(_.map(utils.toArray(message.x), 'message_format'))[0] : message.format;

    if (message.subject || type === 'topic') {
      message.type = 'info';
    } else if (this.handleInfoMessage(message)) {
      _.assign(message, {
        type: 'info',
        sender: ' ',
        color: 'nocolor'
      });
    } else if (type === 'system' || type === 'notification') {
      message.type = 'notification';
      if (this.isQuoteMessage(message)) {
        return this.formatQuoteMessage(message);
      } else if (this.isCodeMessage(message)) {
        return this.formatCodeMessage(message);
      } else if (this.isMonospaceMessage(message)) {
        return this.formatMonospaceMessage(message);
      }
    } else if (type === 'room-presence') {
      message.type = 'info';
      message.is_presence_message = true;
    } else if (type === 'missed-call') {
      message.type = 'info';
      message.is_missed_call_message = true;
    } else if (message.authenticated_file || message.file) {
      let file = message.authenticated_file || message.file;
      message.type = 'file';
      message.body = file.desc || message.body || '';
      format = 'text';
    } else if (message.x && typeof message.x.file !== 'undefined') {
      message.type = 'file';
      message.body = _.get(message, 'x.file.desc') || message.body || '';
    } else if (type === 'user_state') {
      message.format = 'html';
    } else if (message.xhtml_im_body) {
      message.format = 'html';
      message.type = 'notification';
    } else if (!_.isUndefined(message.body)) {
      message.type = 'message';
      message.body = message.body.toString();
      if (this.isQuoteMessage(message)) {
        return this.formatQuoteMessage(message);
      } else if (this.isCodeMessage(message)) {
        return this.formatCodeMessage(message);
      } else if (this.isMonospaceMessage(message)) {
        return this.formatMonospaceMessage(message);
      }
    }
    message.format = format || 'text';

    if (message.format === 'html') {
      if (message.xhtml_im_body) {
        message.xhtml_im_body = utils.getFixedHtml(message.xhtml_im_body);
      } else {
        message.body = utils.getFixedHtml(message.body);
      }
    }
  }

  setMessageSenderAndAvatar(message, sender) {
    if (sender) {
      var avatar = this.getNotificationAvatar(sender);
      if (avatar) {
        message.sender_avatar = avatar;
      }
      message.notification_sender = sender;
    }
  }

  processMessageMetadata(message) {
    let messageMetadata = _.get(message.card, 'metadata', {});

    if (message.notification_sender && message.notification_sender.type === "addon") {
      messageMetadata.sender_addon_key = message.notification_sender.id;
    }

    message.metadata = messageMetadata;

    if (message.metadata.sender_addon_key) {
      let payload = IntegrationHelper.extractIntegrationParametersFromMessage(message);
      let spec = {addon_key: message.notification_sender.id};

      AppDispatcher.dispatch("integration-iframe-event", MESSAGE_RECEIVED, spec, payload);
    }
  }

  handleInfoMessage(message) {
    if (message.x && !message.body) {
      if (message.x.is_archived) {
        message.body = ChatPanelStrings.user_changed_archive_status(this.getMessageSender(message), parseInt(message.x.is_archived) ? ChatPanelStrings.archived : ChatPanelStrings.unarchived);
        return true;
      } else if (typeof message.x.guest_url !== 'undefined') {
        message.body = ChatPanelStrings.user_changed_guest_access(this.getMessageSender(message), message.x.guest_url ? ChatPanelStrings.turned_on : ChatPanelStrings.turned_off);
        return true;
      }
    }
    return false;
  }

  addLinks(jid, message) {
    if (message.ts && !this.isCodeMessage(message) && !this.isMonospaceMessage(message)) {
      let sender = this.getMessageSender(message);
      let urls = link_utils.get_urls_from_string(message.body);
      urls.forEach((url) => {
        url = link_utils.wrapped_url_fix(message.body, url);
        if (link_utils.url_should_be_replaced(message.body, url)) {
          let link = link_utils.create_link_object(jid, message.ts, url, sender);
          AppDispatcher.dispatch("add-link-from-message", {
            room: jid,
            link: link
          });
        }
      });
    }
  }

  addFile(jid, message) {
    if (message.ts) {
      var sender = this.getMessageSender(message),
        fileModel = File.fromMessageObject(message),
        fileObject = utils.file.create_file_object(jid, fileModel, message.ts, sender);

      if (fileObject) {
        AppDispatcher.dispatch("add-file-from-message", {
          room: jid,
          file: fileObject
        });
      }
    }
  }

  /*
   addXHTML(message) {
   var xhtml,
   $xhtml = $(this.mdParser.render(message.text));
   $xhtml.is('p') ? xhtml = $xhtml.prop('innerHTML') : xhtml = $('<div/>').append($xhtml).html();
   if ($xhtml.children().length) {
   message.xhtml = xhtml;
   }
   return message;
   }
   */

  getAvatar(id) {
    if (!id) {
      return false;
    }
    var roster = this.store.get("roster"),
      user = _.find(roster, (item) => {
        return String(item.id) === String(id);
      });
    return user ? user.photo_url : '';
  }

  processCard(card) {
    if (!_.isString(card)) {
      return false;
    }
    try {
      var cardObj = JSON.parse(card);
      if (_.has(cardObj, 'activity.html')) {
        cardObj.activity.html = this.substituteMentionTagsForHtml(cardObj.activity.html);
      }
      return cardObj;
    } catch (err) {
      logger.error("Error trying to render a card", err);
      return false;
    }
  }

  getNotificationAvatar(sender) {
    if (!sender) {
      return false;
    }
    var type = sender.type;

    if (type === 'user') {
      return this.getAvatar(utils.jid.user_id(sender.id));
    }

    return false;
  }

  getMentionTags(message) {
    return $("<div>" + message + "</div>").find("hc-mention");
  }

  substituteMentionTagsForHtml(messageText) {
    var that = this;
    this.getMentionTags(messageText).each(function () {
      var mentionName = $(this).text();
      var mentionNameWithTag = $('<hc-mention>').append($(this).clone()).html();
      var mentionHtml = utils.escapeAndLinkify(mentionName, that.getMentionArguments());
      messageText = messageText.replace(mentionNameWithTag, mentionHtml);
    });
    return messageText;
  }

  isOneToOneChatClosed(message, jid, active_rooms) {
    var roster = this.store.get("roster");
    return !active_rooms[jid]
      && !message.is_user_sent
      && utils.jid.is_private_chat(jid)
      && roster[jid]
      && parseFloat(message.ts) >= roster[jid].closed_at;
  }

  isEnsoVideoHistoryMessage(message) {
    let messageBody = _.get(message, 'message', '');

    return message.message_format === 'html'
      && messageBody.indexOf('<a') !== -1
      && messageBody.indexOf('data-target-options') !== -1
      && messageBody.indexOf('enso_invite') !== -1
      && messageBody.indexOf(VideoCallStrings.join_video_call_message) !== -1
      && messageBody.indexOf('</a>') !== -1;
  }

}

module.exports = MessageProcessor;



/** WEBPACK FOOTER **
 ** ./src/js/app/processors/message_processor.js
 **/