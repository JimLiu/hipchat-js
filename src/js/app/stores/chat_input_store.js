import AppConfig from 'config/app_config';
import Store from 'lib/core/store';
import RosterStore from './roster_store';
import PreferencesStore from './preferences_store';
import AppDispatcher from 'dispatchers/app_dispatcher';
import utils from 'helpers/utils';
import { chatSearch } from 'helpers/chat_search';
import Strings from 'strings/file_input_errors';
import Presence from 'lib/enum/presence';
import { commands as slashCommands } from 'helpers/slash_command_helper';
import { sort_users as sortUsers } from 'helpers/user_utils';
import AnalyticsActions from 'actions/analytics_actions';
import DialogActions from 'actions/dialog_actions';
import KeyboardShortcuts from 'helpers/keyboard_shortcuts';

class ChatInputStore extends Store {

  constructor() {

    super();

    this.local = {
      unsentText: {}, // map of last input text value
      uploadingStatus: {}, // map of jid to uploading status
      allRooms: {}, // map of allRooms to get active chat data needed for store
      guests: [], // local property for mention autocomplete, should not trigger a render
      members: [], // local property for mention autocomplete, should not trigger a render
      users: {}, // local property for mention autocomplete, should not trigger a render
      room_privacy: '', // local property for mention autocomplete, should not trigger a render
      caret_position: 0, // current caret position of the input, should not trigger a render
      input_history: {}, // map of chat input text history
      input_history_index: {}, // map of current index of chat input history in use
      unsent_text_before_recall: {}, // map of unsent text in input typed before recalling input history
      upload_progress: {}
    };
  }

  getDefaults(){
    return {
      active_autocomplete: null,
      active_chat: null,
      active_chat_id: null,
      attachment_expanded: false,
      can_share_files: true,
      can_use_oto_chats: true,
      chat_type: '',
      default_mentions: _.map(AppConfig.core_mentions, (mention) => {
        return {
          jid: mention.jid,
          name: mention.name,
          mention_name: mention.mention_name,
          presence: {
            show: Presence.AVAILABLE
          }
        };
      }),
      emoticon_list: [],
      emoticon_text: '',
      emoticon_selected_item: 0,
      emoticon_results_count: 0,
      emoticon_regex: AppConfig.emoticon_regex,
      file: null,
      file_error: false,
      file_error_message: '',
      file_name: '',
      mention_list: [],
      mention_text: '',
      mention_selected_item: 0,
      mention_results_count: 0,
      mention_regex: AppConfig.mention_regex,
      message_id: 0,
      new_forced_caret_position: 0,
      path_prefix: '',
      post_emoticon_text: '',
      post_mention_text: '',
      pre_emoticon_text: '',
      pre_mention_text: '',
      room_is_archived: true,
      should_animate_avatar: true,
      slash_command_list: [],
      slash_command_results_count: 0,
      slash_command_selected_item: 0,
      smileys: {},
      text: '',
      uploading: false,
      upload_progress: null,
      user_is_admin: false,
      user_is_guest: false,
      user_state: 'active',
      video_enabled: false,
      keyboard_shortcuts: null,
      keyboard_shortcuts_initialized: false,
      web_server: ''
    };
  }

  registerListeners() {

    AppDispatcher.registerOnce({
      'hc-init': (config) => {
        this.handleConfig(config);
      }
    });

    AppDispatcher.register({
      'app-state-ready': () => {
        this.set('initialized', true);

        if (!this.data.keyboard_shortcuts_initialized) {
          this.set('keyboard_shortcuts_initialized', true);
          KeyboardShortcuts.init(this.data.keyboard_shortcuts);
        }
      },
      'updated:config': (config) => {
        this.handleConfig(config);
      },
      'updated:preferences': () => {
        this.handlePreferences();
      },
      'updated:current_user': (data) => {
        this.data.user_is_admin = !!data.is_admin;
        this.data.user_is_guest = !!data.is_guest;
      },
      'updated:web_server': (server) => {
        this.data.web_server = server;
      },
      'updated:permissions': (perms) => {
        this.set({
          can_share_files: perms.file_sharing === 'all',
          can_use_oto_chats: perms.oto_chat === 'all'
        });
      },
      'close-room': (data) => {
        this.deleteInputHistory(data.jid);
        this.deleteUnsentText(data.jid);
        this.deleteUploadingStatus(data.jid);
      },
      'updated:activeRooms': (rooms) => {
        this.handleActiveRoomsUpdate(rooms);
      },
      'send-message': (data) => {
        this.saveInputHistory(data);
        this.resetHistoryIndex(data.jid);
        this.data.message_id++;
        if (data.source !== 'api') {
          this.set({
            text: '',
            message_id: this.data.message_id,
            user_state: 'active'
          });
        }
      },
      'initiate-edit-message': (msg) => {
        let isExpired = Date.now() - (msg.time * 1000) > AppConfig.edit_message_threshold;
        if (isExpired) {
          DialogActions.showNotEditableDialog({action: 'edit'});
        } else if (!msg.is_deleted) {
          DialogActions.showEditMessageDialog(msg);
        }
      },
      'initiate-delete-message': (msg) => {
        let isExpired = Date.now() - (msg.time * 1000) > AppConfig.edit_message_threshold;
        if (isExpired) {
          DialogActions.showNotEditableDialog({action: 'delete'});
        } else if (!msg.is_deleted) {
          DialogActions.showDeleteMessageDialog(msg);
        }
      },
      'clear-messages': () => {
        this.clearText();
      },
      'clear-chat-input': () => {
        this.clearText();
      },
      'recall-newer-message': (e) => {
        if (this.isFocused()) {
          this.recallNewerMessage();
          e.preventDefault();
        }
      },
      'recall-older-message': (e) => {
        if (this.isFocused()) {
          this.recallOlderMessage();
          e.preventDefault();
        }
      },
      'updated:smileys': (data) => {
        let smileys = _.keyBy(_.keyBy(data, 'file'), 'shortcut');
        this.set({ smileys });
      },
      'updated:emoticons': (data) => {
        this.set({
          path_prefix: data.path_prefix,
          emoticons: data.icons
        });
      },
      'before:updated:active_chat': () => {
        this.setUnsentText(this.data.active_chat);
        this.setUploadingStatus(this.data.active_chat);
      },
      'updated:active_chat': (jid) => {
        let data = _.assign({}, {
          active_chat: jid,
          active_chat_id: this._getActiveChatId(jid),
          chat_type: utils.room.detect_chat_type(jid),
          room_is_archived: utils.room.is_archived(this.local.allRooms[jid]),
          text: this.getUnsentText(jid),
          upload_progress: this.getUploadProgress(jid)
        }, this.getUploadingStatus(jid));

        this.set(data);

        if (this.data.file
          && this.data.attachment_expanded
          && this.data.file.file_obj
          && !this.data.file_error
          && !this.data.uploading) {
          AppDispatcher.dispatch('open-tooltip', {
            type: 'upload_preview',
            data: {
              file: this.data.file.file_obj
            }
          });
        } else {
          AppDispatcher.dispatch('close-tooltip', {
            type: 'upload_preview'
          });
        }
      },
      'upload-file': () => {
        this.set({
          uploading: true
        });
      },
      'upload-successful': ({ jid, text }) => {
        this.updateUploadingStatus(jid, {
          uploading: false,
          attachment_expanded: false,
          file: null,
          file_extension: '',
          file_name: ''
        });
        if (jid === this.data.active_chat &&
            text === this.data.text) {
              this.clearText();
        }
        if (jid !== this.data.active_chat &&
            text === this.local.unsentText[jid]){
            delete this.local.unsentText[jid];
        }
      },
      'upload-failed': (data) => {
        this.updateUploadingStatus(data.jid, {
          uploading: false
        });
      },
      'upload-progress-update': ({ jid, percentage }) => {
        this.local.upload_progress[jid] = percentage;
        this.updateUploadProgress(jid);
      },
      'upload-complete': ({ jid }) => {
        delete this.local.upload_progress[jid];
        this.updateUploadProgress(jid);
      },
      'set-message-value': (text) => {
        this.set('text', text);
        this.resetHistoryIndex(this.data.active_chat);
      },
      'append-message-value': (text) => {
        this.set('text', _.get(this.data, 'text', '') + text);
      },
      'expand-attachment': (data) => {
        this.updateUploadingStatus(data.jid, {
          attachment_expanded: true,
          file: data.file,
          file_name: data.file_name,
          file_error: false,
          file_extension: utils.file.get_extension(data.file_name),
          file_selection_source: data.file_selection_source
        });
      },
      'close-attachment': (data) => {
        this.updateUploadingStatus(data.jid, {
          attachment_expanded: false,
          file: null,
          file_name: '',
          file_error: false,
          file_extension: ''
        });
      },
      'set-chat-caret-position': (caretPosition) => {
        this.local.caret_position = caretPosition;
      },
      'reset-new-forced-caret-position': () => {
        this.set('new_forced_caret_position', 0);
      },
      'sender-clicked': (data) => {
        var text = this.data.text,
            caret_position = this.local.caret_position;

        if (text.indexOf(data.mention + ' ') === -1){
          this.local.caret_position = caret_position + data.mention.length + 1;
          this.resetHistoryIndex(this.data.active_chat);
          this.set({
            text: `${text.substr(0, caret_position)}${data.mention} ${text.substr(caret_position)}`,
            new_forced_caret_position: this.local.caret_position
          });
        }
      },
      'change-filename': (data) => {
        this.set('file_name', data.file_name);
      },
      'smiley-chosen': (data) => {
        this.handleSmileyChosen(data);
      },
      'set-user-state': (data) => {
        if (this.data.user_state !== data.state) {
          this.data.user_state = data.state;
        }
      },
      'file-error': (data) => {
        this.updateUploadingStatus(data.jid, {
          'file_error': true,
          'file_error_message': Strings[data.key]
        });
      },
      'clear-errors': (data) => {
        this.updateUploadingStatus(data.jid, {
          'file_error': false,
          'file_error_message': ''
        });
      },
      'dismiss-emoticon-autocomplete': () => {
        this.dismissEmoticonAutoComplete();
      },
      'process-emoticon-text': (data) => {
        this.processEmoticonText(data.text, data.caret_position);
      },
      'emoticon-selected': () => {
        this.handleEmoticonSelected();
      },
      'dismiss-mention-autocomplete': () => {
        this.dismissMentionAutoComplete();
      },
      'process-mention-text': (data) => {
        this.processMentionText(data.text, data.caret_position);
      },
      'process-slash-command-text': ({ text, caret_position }) => {
        this.processSlashCommandText(text, caret_position);
      },
      'navigate-autocomplete': (data) => {
        this.navigateAutoComplete(data.autocomplete, data.direction);
      },
      'mention-selected': () => {
        this.handleMentionSelected();
      },
      'menu-item-hovered': (data) => {
        this.updateActiveMenuItem(data);
      },
      'slash-command-selected': () => {
        this.handleSlashCommandSelected();
      }
    });
  }

  updateUploadProgress(jid){
    if (jid === this.data.active_chat){
      this.set('upload_progress', this.getUploadProgress(jid));
    }
  }

  getUploadProgress(jid){
    const percentage = this.local.upload_progress[jid];
    return (percentage !== undefined) ? percentage : null;
  }

  handleActiveRoomsUpdate(rooms) {
    var active_chat,
        room_is_archived,
        active_chat_id;

    this.local.allRooms = rooms;
    active_chat = this.local.allRooms[this.data.active_chat];

    if (active_chat) {
      room_is_archived = utils.room.is_archived(active_chat);
      active_chat_id = this._getActiveChatId(active_chat.jid);
      if (active_chat.type !== this.data.chat_type || room_is_archived !== this.data.room_is_archived || this.data.active_chat_id !== active_chat_id) {
        // We only want the store updated if these values have changed
        this.set({
          active_chat_id: active_chat_id,
          chat_type: active_chat.type,
          room_is_archived: room_is_archived
        });
      }
    }
  }

  processEmoticonText(text, caret_position) {
    var pre_emoticon = text.substring(0, caret_position),
        post_emoticon = text.substring(caret_position),
        emoticon_text = pre_emoticon.split(this.data.emoticon_regex).slice(-1)[0],
        filtered_list,
        sliced_list;

    if (emoticon_text.indexOf('(') === 0 && emoticon_text !== '(') {
      this.data.emoticon_text = emoticon_text.toLowerCase();
      filtered_list = this.filterEmoticonList(this.data.emoticon_text);
      sliced_list = filtered_list.slice(0, 40);
      this.set({
        emoticon_text: emoticon_text,
        emoticon_selected_item: 0,
        pre_emoticon_text: pre_emoticon,
        post_emoticon_text: post_emoticon,
        path_prefix: this.data.path_prefix,
        emoticon_list: sliced_list,
        emoticon_results_count: sliced_list.length,
        active_autocomplete: 'emoticon'
      });
    } else {
      if (this.data.active_autocomplete === 'emoticon') {
        this.dismissEmoticonAutoComplete();
      }
    }
  }

  filterEmoticonList(text) {
    var filtered, query = text.slice(1),
      wrap = (match) => {
        return `<strong>${match}</strong>`;
      };
      filtered = _.filter(this.getEmoticons(), (emoticon) => {
        return emoticon.shortcut.indexOf(query) !== -1;
      });

      filtered = _.sortBy(filtered, (emoticon) => {
        return emoticon.shortcut.indexOf(query);
      });
      filtered = _.forEach(filtered, (emoticon) => {
        emoticon.match_markup = emoticon.shortcut.split(query).join(wrap(query));
      });
    return filtered;
  }

  getEmoticons() {
    var emoticons = _.toArray(this.data.emoticons),
        default_emoticons = _.filter(_.toArray(this.data.smileys), (smileys) => {
          return smileys.shortcut.indexOf('(') === 0;
        });
    return _.sortBy(emoticons.concat(default_emoticons), 'shortcut');
  }

  handleEmoticonSelected() {
    var emoticon = this.data.emoticon_list[this.data.emoticon_selected_item],
        new_pre_text = this.getPreEmoticonOnSelect(emoticon.shortcut),
        new_post_text = this.data.post_emoticon_text,
        first_space = this.data.post_emoticon_text.indexOf(' ');

    if (first_space !== 0) {
      new_post_text = this.data.post_emoticon_text.slice(first_space + 1);
    }

    this.set({
      text: new_pre_text + new_post_text,
      new_forced_caret_position: new_pre_text.length
    });
    this.dismissEmoticonAutoComplete();
  }

  handleSlashCommandSelected(){
    var slash_command = this.data.slash_command_list[this.data.slash_command_selected_item];

    let command;

    if (slash_command.name.indexOf(this.data.text) === 0){
      command = slash_command.name;
    } else {
      for (let alias of slash_command.aliases){
        if (alias.indexOf(this.data.text) === 0){
          command = alias;
        }
      }
    }

    AnalyticsActions.slashCommandUsedInAutocomplete({
      room: utils.jid.is_room(this.data.active_chat) ? this.data.active_chat_id : null,
      slashUsed: command
    });

    let text = `${command} `;

    this.set({
      text,
      new_forced_caret_position: text.length
    });
    this.dismissSlashCommandAutoComplete();
  }

  getPreEmoticonOnSelect(shortcut) {
    return this.data.pre_emoticon_text.slice(0, -this.data.emoticon_text.length) + shortcut + ' ';
  }

  dismissEmoticonAutoComplete() {
    this.set({
      emoticon_text: '',
      emoticon_selected_item: 0,
      emoticon_results_count: 0,
      emoticon_list: [],
      active_autocomplete: null
    });
  }

  clearText() {
    this.resetHistoryIndex(this.data.active_chat);
    this.set({
      text: ''
    });
  }

  handleSmileyChosen(data) {
    var caret = this.local.caret_position;
    var text = this.data.text;

    var position;

    if (caret === 0 || !text) {
      text = `${data.shortcut} ` + text.trim();
      position = data.shortcut.length + 1;
    } else if (caret === text.length) {
      text = text.trim() + ` ${data.shortcut} `;
      position = text.length;
    } else {
      text = text.substr(0, caret).trim() + ` ${data.shortcut} ` + text.substr(caret).trim();
      position = caret + data.shortcut.length + 1;
    }

    this.set({
      text,
      new_forced_caret_position: position
    });
  }

  setUnsentText(jid) {
    if (utils.jid.is_chat(jid)) {
      this.local.unsentText[jid] = this.data.text;
    }
  }

  getUnsentText(jid) {
    return this.local.unsentText[jid] || '';
  }

  deleteUnsentText(jid) {
    delete this.local.unsentText[jid];
  }

  updateUploadingStatus(jid, data){
    if (this.data.active_chat === jid){
      this.set(data);
    } else {
      this.setUploadingStatus(jid, data);
    }
  }

  setUploadingStatus(jid, data) {
    if(utils.jid.is_chat(jid)) {
      if (data){
        this.local.uploadingStatus[jid] = _.assign({}, this.local.uploadingStatus[jid], data);
      } else {
        this.local.uploadingStatus[jid] = _.pick(this.data, [
          'uploading',
          'attachment_expanded',
          'file',
          'file_error',
          'file_error_message',
          'file_extension',
          'file_name',
          'file_selection_source'
        ]);
      }
    }
  }

  getUploadingStatus(jid) {
    return this.local.uploadingStatus[jid] || {
        uploading: false,
        attachment_expanded: false,
        file: null,
        file_error: '',
        file_error_message: '',
        file_extension: '',
        file_name: '',
        file_selection_source: null
      };
  }

  deleteUploadingStatus(jid) {
    delete this.local.uploadingStatus[jid];
  }

  updateRoomData() {
    var room = RosterStore.getAll();
    this.local.guests = room.participants.guests;
    this.local.members = room.participants.members;
    this.local.users = room.users;
    this.local.room_privacy = room.active_chat_privacy;
  }

  processMentionText(text, caret_position) {
    var pre_mention = text.substring(0, caret_position),
        post_mention = text.substring(caret_position),
        mention_text = pre_mention.split(/\s/).slice(-1)[0];

    if (mention_text.indexOf('@') === 0) {
      this.updateRoomData();
      let giving_out = this.getMentionList(mention_text).slice(0, 25);
      let results = sortUsers(giving_out, mention_text.slice(1), 'mention_name');

      this.set({
        mention_list: results,
        mention_results_count: results.length,
        mention_text: mention_text,
        mention_selected_item: 0,
        pre_mention_text: pre_mention,
        post_mention_text: post_mention,
        active_autocomplete: 'mention'
      });
    } else {
      if (this.data.active_autocomplete === 'mention') {
        this.dismissMentionAutoComplete();
      }
    }
  }

  getMentionList(mention_text) {
    var query = mention_text.slice(1),
        room = this.local.allRooms[this.data.active_chat],
        participants_fully_initialized = room && room.participants_fully_initialized,
        people_in_this_room = this.local.members.concat(this.local.guests).concat(this.data.default_mentions),
        priorities,
        results;

    if (query === '') {
      priorities = _.map(this.data.default_mentions, 'jid');
      results = chatSearch(people_in_this_room, query, priorities);

    } else if (this.local.room_privacy === 'private' && participants_fully_initialized || this.data.user_is_guest) {
      results = chatSearch(people_in_this_room, query);

    } else {
      let people_to_search = this.removeGuests(this.local.users).concat(this.local.guests).concat(this.data.default_mentions);
      priorities = _.map(people_in_this_room, 'jid');
      results = chatSearch(people_to_search, query, priorities);
    }

    return results;
  }

  processSlashCommandText(text, caret_position){

      if (!this.data.web_client_slash_command_autocomplete_enabled){
        return;
      }

      if (/^\/(\w*)$/.test(text) && caret_position > 0) {
        let filtered = _.filter(slashCommands, ({ name, aliases, members_only, oto_only, room_only, filter }) => {
            if (oto_only && !utils.jid.is_private_chat(this.data.active_chat) ||
                room_only && !utils.jid.is_room(this.data.active_chat) ||
                members_only && this.data.user_is_guest ||
                filter && !filter({ video_enabled: this.data.video_enabled })){
              return false;
            }

            if (name.indexOf(text) === 0){
              return true;
            }

            for (let alias of aliases) {
              if (alias.indexOf(text) === 0){
                return true;
              }
            }

          });

        let sorted = _.sortBy(filtered, 'name');
        let normalized = sorted.map(({ name, usage, description, aliases }) => ({ name, usage, description, aliases }));

        this.set({
          active_autocomplete: "slash_command",
          slash_command_list: normalized,
          slash_command_selected_item: 0,
          slash_command_results_count: normalized.length
        });

      } else if (this.data.active_autocomplete === 'slash_command') {
          this.dismissSlashCommandAutoComplete();
      }
  }

  dismissSlashCommandAutoComplete(){
    this.set({
      slash_command_list: [],
      slash_command_selected_item: 0,
      slash_command_results_count: 0,
      active_autocomplete: null
    });
  }

  removeGuests(users) {
    // Remove guests in the roster
    return _.reject(_.toArray(users), utils.user.is_guest);
  }

  navigateAutoComplete(autocomplete, direction) {
    if (autocomplete === 'mention' ||
        autocomplete === 'emoticon' ||
        autocomplete === 'slash_command') {
        if (direction === 'up') {
          this.navigateAutocompleteUp(autocomplete);
        } else if (direction === 'down') {
          this.navigateAutocompleteDown(autocomplete);
        }
    }
  }

  navigateAutocompleteUp(type) {
    var selected_item = this.data[`${type}_selected_item`],
        results_count = this.data[`${type}_results_count`],
        new_index;

    if (selected_item > 0) {
      new_index = selected_item - 1;
    } else {
      new_index = results_count - 1;
    }
    this.set({
      [`${type}_selected_item`]: new_index
    });
  }

  navigateAutocompleteDown(type) {
    var selected_item = this.data[`${type}_selected_item`],
        results_count = this.data[`${type}_results_count`],
        new_index;

    if (selected_item < (results_count - 1)) {
      new_index = selected_item + 1;
    } else {
      new_index = 0;
    }
    this.set({
      [`${type}_selected_item`]: new_index
    });
  }

  handleMentionSelected() {
    var user = this.data.mention_list[this.data.mention_selected_item],
        new_pre_text = this.getPreMentionOnSelect((user.mention_name)),
        new_post_text = this.data.post_mention_text;
    this.set({
      text: new_pre_text + new_post_text,
      new_forced_caret_position: new_pre_text.length
    });
    this.dismissMentionAutoComplete();
  }

  getPreMentionOnSelect(mention_name) {
    return this.data.pre_mention_text.slice(0, -this.data.mention_text.length) + '@' + mention_name + ' ';
  }

  updateActiveMenuItem(data) {
    this.set(`${data.type}_selected_item`, data.index);
  }

  dismissMentionAutoComplete() {
    this.set({
      active_autocomplete: null,
      mention_list: [],
      mention_text: '',
      pre_mention_text: '',
      post_mention_text: '',
      mention_selected_item: 0,
      mention_results_count: 0
    });
  }

  recallOlderMessage() {
    var jid = this.data.active_chat,
        index = this.local.input_history_index[jid];

    if (_.isEmpty(this.local.input_history[jid])) {
      return;
    }

    if (_.isNull(index) || _.isUndefined(index)) {
      this.local.unsent_text_before_recall[jid] = this.data.text;
      index = 0;
      this.local.input_history_index[jid] = index;
      this.set('text', this.local.input_history[jid][index]);
      return;
    }

    if (index < this.local.input_history[jid].length - 1) {
      index++;
      this.local.input_history_index[jid] = index;
      this.set('text', this.local.input_history[jid][index]);
    }
  }

  recallNewerMessage() {
    var jid = this.data.active_chat,
        index = this.local.input_history_index[jid];

    if (_.isNull(index) || _.isUndefined(index)) {
      return;
    }

    if (index) {
      index = --this.local.input_history_index[jid];
      this.set('text', this.local.input_history[jid][index]);
    } else {
      this.resetHistoryIndex(jid);
      this.set('text', this.local.unsent_text_before_recall[jid]);
    }
  }

  /**
   * Saves sent message to chat input history and manages stack
   *
   * Input history is saved per room, using messages sent within this client during this session.
   * The input history arrays are queues, wherein new messages are added to the front of the array
   * and older messages removed from the end of the array.
   *
   * @method saveInputHistory
   */
  saveInputHistory(message) {
    var text = message.text.trim(),
        jid = message.jid;

    if (!this.local.input_history[jid]) {
      this.local.input_history[jid] = [];
    }

    if (this.local.input_history[jid].length === AppConfig.input_history_max) {
      this.local.input_history[jid].pop();
    }

    this.local.input_history[jid].unshift(text);
  }

  deleteInputHistory(jid) {
    delete this.local.input_history[jid];
    delete this.local.input_history_index[jid];
    delete this.local.unsent_text_before_recall[jid];
  }

  resetHistoryIndex(jid) {
    this.local.input_history_index[jid] = null;
  }

  isFocused() {
    return _.get(document.activeElement, 'id') === AppConfig.chat_input_id;
  }

  _getActiveChatId(jid){

    let active_chat_id = null;

    if (!utils.jid.is_lobby(jid)){
      if (utils.jid.is_private_chat(jid)){
        active_chat_id = utils.jid.user_id(jid);
      } else {
        if (this.local.allRooms[jid]) {
          active_chat_id = parseInt(this.local.allRooms[jid].id);
        }
      }
    }

    return active_chat_id;
  }

  handlePreferences() {
    this.set({
      should_animate_avatar: PreferencesStore.shouldAnimateAvatars()
    });
  }

  handleConfig(config) {
    this.set({
      video_enabled: _.get(config, 'video_chat_enabled') && _.get(config, 'feature_flags.web_client_video_chat'),
      keyboard_shortcuts: _.get(config, 'keyboard_shortcuts'),
      // Defaulting this feature flag to true because existing deployments of HCS don't include this flag
      web_client_addlive_video_enabled: _.get(config, 'feature_flags.web_client_addlive_video', true),

      web_client_enso_video_enabled: _.get(config, 'feature_flags.web_client_enso_video', false),
      web_client_enso_room_video_enabled: _.get(config, 'feature_flags.web_client_enso_room_video', false),
      web_client_slash_command_autocomplete_enabled: _.get(config, 'feature_flags.web_client_slash_command_autocomplete_enabled'),
      message_editing_enabled: _.get(config, 'feature_flags.web_client_message_editing')

    });
  }
}

export default new ChatInputStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/chat_input_store.js
 **/