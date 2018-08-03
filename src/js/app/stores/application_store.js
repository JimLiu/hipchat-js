import utils from 'helpers/utils';
import Store from 'lib/core/store';
import MessageProcessor from 'processors/message_processor';
import IQProcessor from 'processors/iq_processor';
import PresenceProcessor from 'processors/presence_processor';
import AppDispatcher from "dispatchers/app_dispatcher";
import AnalyticsDispatcher from "dispatchers/analytics_dispatcher";
import PreferencesStore from "./preferences_store";
import PreferencesKeys from 'keys/preferences_keys';
import ChatPanelStrings from 'strings/chat_panel_strings';
import DialogStrings from 'strings/dialog_strings';
import Presence from 'lib/enum/presence';
import AppConfig from 'config/app_config';
import AppActions from 'actions/app_actions';
import notifier from 'helpers/notifier';
import logger from 'helpers/logger';
import ConfigStore from 'stores/configuration_store';
import FlagActions from 'actions/flag_actions';

class AppStore extends Store {

  constructor() {

    super();

    this.local = {
      initialized: false,
      user_state: 'active',
      active_type: '',
      profile_jids: [],
      sent_msg_ids: [],
      participants: [],
      closedChats: [],
      deletedRooms: [],
      history_fetch_id: 0,
      chat_states: [
        'active',
        'inactive',
        'composing',
        'gone'
      ],
      emoticons_initialized: false,
      windowFocused: true,
      clearUnreadCounts: false,
      shouldReconcileAutoJoin: false,
      lastSavedAutoJoin: [],
      presence_updates_timers: {}
    };

    this.presenceProcessor = new PresenceProcessor({
      is_guest: _.get(window.HC, "is_guest", false)
    });
    this.iqProcessor = new IQProcessor({
      is_guest: _.get(window.HC, "is_guest", false)
    });

    this.server_data_callbacks = {
      'message': this.handleIncomingMessages,
      'iq': this.handleIQ,
      'presence': this.handlePresence,
      'success': this.handleConnectionSuccess
    };

    this.messageProcessor = new MessageProcessor(this);

    this.debouncedSetActiveRooms = _.debounce(this.setActiveRooms, AppConfig.set_active_rooms_timeout, {
      leading: true,
      trailing: true
    });

    this.debouncedFetchRoomParticipantsFromAPI = _.debounce(this.fetchRoomParticipantsFromAPI, AppConfig.fetch_room_participants_timeout, {
      leading: false,
      trailing: true
    });

    this.refetchReadStateHandler = this.refetchReadState.bind(this);

    this.registerCallbacks();
    this.addChangeHandlers();
  }

  getRoomDefaults(){
    return {
      topic: null,
      admins: [],
      participants: {
        members: [],
        guests: []
      },
      files: [],
      links: [],
      is_archived: '0',
      history_fetch_ids: [],
      show_join_leave_messages: false,
      guest_mention_regex: null,
      most_recent_message: null,
      last_read_message: null,
      avatar_url: '',
      roster_size: 0,
      participants_fully_initialized: false,
      presence: {
        show: '',
        status: '',
        seconds: '',
        idleTime: ''
      },
      unreadCount: 0,
      unreadCountTemp: 0,
      unreadMentionCount: 0,
      unreadMentionJustMeCount: 0,
      isUpdatingUnreadCount: false,
      hasMention: false,
      files_fetched: false,
      links_fetched: false
    };
  }

  getRosterDefaults(){
     return {
       presence: {
         show: 'unknown',
         status: '',
         seconds: '',
         idleTime: ''
       },
       closed_at: utils.getMoment()
     };
  }

  getDefaults() {
    return {
      config: {},
      active_chat: '',
      asset_base_uri: '',
      client_type: '',
      client_subtype: '',
      client_version_id: '',
      video_chat_uri: '',
      current_user: {},
      activeRooms: {},
      allRooms: {},
      newMessages: {},
      roster: {},
      profiles: {},
      smileys: {},
      emoticons: {
        path_prefix: '',
        icons: {}
      },
      mentionRegexUser: null,
      mentionRegexMe: null,
      mentionRegexJustMe: null,
      group_name: '',
      group_id: null,
      conference_server: null,
      chat_server: null,
      api_host: 'api.hipchat.com',
      web_server: null,
      features: {},
      permissions: {},
      release_dialog_content: {},
      ui_available: false,
      is_in_welcome_range: false
    };
  }

  registerCallbacks() {
    AppDispatcher.registerOnce({
      'hc-init': (data) => {
        this.handleHCInit(data);
      },
      'app-state-ready': () => {
        this.fetchReadState();
      },
      'after:app-state-ready': () => {
        // The first moment after the preloader has been hidden
        this.set("ui_available", true);
      },
      'signout': () => {
        var opts = {
          is_guest: _.get(this.data.current_user, "is_guest", false),
          guest_key: _.get(this.data.current_user, "guest_key", false),
          type: '',
          jid: this.data.active_chat,
          preferences: PreferencesStore.getAll()
        };
        AppDispatcher.dispatch('exit-app', opts);
      }
    });
    AppDispatcher.register({
      'configuration-change': (data) => {
        this.handleConfigChange(data);
      },
      'feature-flags-update': (feature_flags) => {
        this.updateFeatureFlags(feature_flags);
        $(document).trigger('app-feature-flags', feature_flags);
      },
      'auth-token-update': (data) => {
        this.updateConfig(data);
      },
      'update-sid': (data) => {
        this.updateConfig(data);
        logger.info('SID was updated: ', data.sid);
        logger.type('sid').info('SID was updated: ', data.sid);
      },
      'server-data': (data) => {
        this.handleServerData(data);
      },
      'app-state-ready': () => {
        this.handleAppStateReady();
      },
      'open-room': (data) => {
        this.handleOpenRoom(data);
      },
      'join-room': (data) => {
        this.handleJoinRoom(data);
      },
      'close-room': (data) => {
        this.handleCloseRoom(data.jid);
      },
      'delete-room': (data) => {
        this.local.deletedRooms.push(data.jid);
      },
      'send-message': (data) => {
        this.handleSendMessage(data);
      },
      'fetch-attachment-image': (messageObj) => {
        messageObj = _.groupBy(messageObj, 'room');
        this.set({
          newMessages: messageObj
        });
        this._handleNewMessageUpdate(messageObj);
      },
      'update-presence': (presence) => {
        this.updatePresence(presence);
        if (presence.show === 'away') {
          AppDispatcher.registerOnce('update-presence', this.refetchReadStateHandler);
        }
      },
      'DAL:handle-joined-rooms': (rooms) => {
        this.handleJoinedRooms(rooms);
      },
      'hide-join-messages': () => {
        _.forOwn(this.data.activeRooms, (room) => {
          room.show_join_leave_messages = false;
        });
      },
      'guest-access-changed': (data) => {
        let chat = this.data.allRooms[data.jid];
        if (chat) {
          _.assign(chat, {guest_url: data.url});
        }
        this.handleRoomUpdate(chat);
      },
      'new-active-chat': (data) => {
        this._updateReadStateForActiveChat();
        this._clearUnreadCountForChat(this.data.active_chat);

        this.local.active_type = /@chat/.test(data.jid) ? 'chat' : 'groupchat';
        this.set('active_chat', data.jid);

        this.setActiveGuestUserRegex();
        this._updateReadStateForActiveChat();
        this._clearUnreadCountForChat(data.jid);

        if (utils.jid.is_room(data.jid) && _.get(this.data.activeRooms, [data.jid, 'roster_size'], false)) {
          this.initializeRoomParticipants(data.jid);
        }
      },
      'request-ancient-history': (data, cb) => {
        this.local.history_fetch_id++;
        data.id = 'history:' + this.local.history_fetch_id;
        if (this.data.activeRooms[data.jid]) {
          this.data.activeRooms[data.jid].history_fetch_ids.push(data.id);
        }
        AppDispatcher.dispatch('fetch-previous', data, cb);
      },
      'remove-room-participant': (data) => {
        this.removeRoomParticipant(data);
      },
      'add-room-visitor': (data) => {
        this.addVisitor(data);
      },
      'add-room-participant': (data) => {
        this.addRoomParticipant(data);
      },
      'room-presence-received': (data) => {
        this.handleRoomPresence(data);
      },
      'user-removed': (data) => {
        this.handleUserRemoved(data);
      },
      'handle-cached-room': (room) => {
        this.handleRooms(room);
      },
      'DAL:handle-new-room': (room) => {
        this.handleRooms(room);
      },
      'DAL:handle-created-room': (room) => {
        this.handleNewRoom(room);
      },
      'DAL:handle-fetched-links': (chatLinksResponse) => {
        this.handleLinkQueryResponse(chatLinksResponse);
      },
      'DAL:handle-fetched-files': (chatFilesResponse) => {
        this.handleFileQueryResponse(chatFilesResponse);
      },
      'add-link-from-message': (data) => {
        this.addLinkFromMessageToRoom(data.room, data.link);
      },
      'add-file-from-message': (data) => {
        this.addFileFromMessageToRoom(data.room, data.file);
      },
      'global-presence-received': (data) => {
        this.handleGlobalPresence(data);
      },
      'groupchat-invite-received': (message) => {
        this.handleInviteMessage(message);
      },
      'groupchat-invite-accepted': (data) => {
        this.handleRoomInviteAccepted(data.jid);
      },
      'private-chat-invite-received': (message) => {
        this.handlePrivateChatInvite(message);
      },
      'enso.invite-to-audio-video-call': (data) => {
        this.handlePrivateChatInvite(data.message);
      },
      'set-user-state': (data) => {
        if (this.local.user_state !== data.state) {
          this.local.user_state = data.state;
          AppDispatcher.dispatch('send-user-state-message', data);
        } else if (data.state === 'composing') {
          AppDispatcher.dispatch('send-user-state-message', data);
        }
      },
      'status-message-received': (data) => {
        this.handleChatStateMessage(data);
      },
      'mark-chats-as-read': () => {
        var chats = _.values(this.data.activeRooms);
        this.resetReadStateCounts(chats);
      },
      'mark-rooms-as-read': () => {
        var rooms = _.filter(this.data.activeRooms, (chat) => {
              return utils.jid.is_room(chat.jid);
            });
        this.resetReadStateCounts(rooms);
      },
      'mark-people-as-read': () => {
        var people = _.filter(this.data.activeRooms, (chat) => {
              return utils.jid.is_private_chat(chat.jid);
            });
        this.resetReadStateCounts(people);
      },
      'archive-room': (data, cb) => {
        this.handleArchiveRoom(data, true, cb);
      },
      'unarchive-room': (data, cb) => {
        this.handleArchiveRoom(data, false, cb);
      },
      'room-archived': (data) => {
        this.handleArchivedRoom(data, '1');
      },
      'room-unarchived': (data) => {
        this.handleArchivedRoom(data, '0');
      },
      'DAL:handle-topic-updated': (data) => {
        this.handleTopicUpdated(data.topic, data.jid);
      },
      'enable-dark-feature': (feature) => {
        this.handleEnableDarkFeature(feature);
      },
      'open-chat-by-mention-name': (mentionName) => {
        this.openChatByMentionName(mentionName);
      },
      'missed-call': (data) => {
        this.handleMissedCall(data);
      },
      'call-declined': (data) => {
        this.handleCallDeclined(data);
      },
      'application-focused': () => {
        this.local.windowFocused = true;
        this._updateReadStateForActiveChat();
        this._clearUnreadCountForChat(this.data.active_chat);
      },
      'application-blurred': () => {
        this.local.windowFocused = false;
      },
      'strophe-disconnecting': () => {
        AppDispatcher.unregister('update-presence', this.refetchReadStateHandler);
      },
      'strophe-reconnecting': () => {
        this.local.shouldReconcileAutoJoin = true;
        this.resetRoomParticipantsListInitializedFlag();
      },
      'before:app-state-reconnected': () => {
        this.resetFilesAndLinksFetching();
      },
      'app-state-reconnected': () => {
        this.refetchReadState();
      },
      'fetch-files': ({room}) => {
        if (_.get(this.data.activeRooms, room)) {
          this.data.activeRooms[room].files_fetching = true;
          this.set('activeRooms', this.data.activeRooms);
        }
      },
      'fetch-links': ({room}) => {
        if (_.get(this.data.activeRooms, room)) {
          this.data.activeRooms[room].links_fetching = true;
          this.set('activeRooms', this.data.activeRooms);
        }
      },
      'preferences-saved': (data) => {
        if (data.autoJoin){
          this.local.lastSavedAutoJoin = data.autoJoin;
        }
      },
      'updated:preferences': (newPreferences) => {
        let config = _.get(this.data, 'config', {}),
            preferences = _.get(config, 'preferences', {});

        config.preferences = _.merge(preferences, newPreferences);
        // Write directly to `data`. We don't want to call this.set() here, because we're responding to
        // a change in the prefs store and we don't want to trigger another with the same data.
        this.data.config = config;

        this._updateTotalUnreadCount();
      },
      'set-room-participants-fully-initialized': (roomJid) => {
        let room = _.get(this.data.activeRooms, roomJid);
        if (room) {
          this.setRoomParticipantsFullyInitialized(room);
        }
      },
      'API:fetched-recent-history': (data) => {
        this.handleIncomingMessages(data, this);
      },
      'DAL:guest-fetched-room-participants': (data) => {
        this.handleGuestRoomParticipants(data.items);
      },
      'DAL:fetched-room-participants': (data) => {
        this.handleRoomParticipantsFromAPI(data);
      },
      'DAL:readstate-fetched': (err, data) => {
        this.handleReadState(err, data);
      }
    });
  }

  updateConfig(data) {
    let config = _.merge(this.data.config, data);
    this.set({ config });
  }

  handleAppStateReady() {
    AnalyticsDispatcher.dispatch('analytics-client-ready', { name: 'hipchat.client.ready'});

    while (this.local.profile_jids.length) {
      var jid = this.local.profile_jids.shift();
      AppDispatcher.dispatch('request-profile', jid);
    }

    var activeSize = _.size(this.data.activeRooms);
    var isFounder = _.size(this.data.roster) === 1;
    if (this._isFirstLogin() && !this.data.current_user.is_guest) {

      // if there's no firstLoginDate then set one in prefs
      AppDispatcher.dispatch('set-first-login-date');

      this._showWelcomeDialog();

      // invited users have no rooms in their autoJoin so we open a room for them, if it exists
      if (activeSize === 0 && isFounder) {
        this.onBoardNewUser(activeSize);
      }
    }

    this.verifyOTOChats();
  }

  _showWelcomeDialog() {
    let isWelcomeDialogEnabled = _.get(this.data.config, 'feature_flags.web_client_is_welcome_dialog_enabled', false);

    if (isWelcomeDialogEnabled && this.data.is_in_welcome_range) {
      AppDispatcher.dispatch('show-modal-dialog', {
        dialog_type: 'welcome-dialog',
        dialog_data: {}
      });
    }
  }

  _isFirstLogin(preferences = PreferencesStore.getAll()){
    var firstLoginDate = _.get(preferences, "properties.firstLoginDate");
    firstLoginDate = parseInt(firstLoginDate, 10);
    return _.isNaN(firstLoginDate);
  }

  _handleWelcomeRange(peopleAmount) {
    let peopleAmountMax = AppConfig.welcome_dialog.max_size_of_group_to_display;

    let isFirst = peopleAmount === 1 ? true : false,
        isLessThanMax = peopleAmount <= peopleAmountMax ? true : false;

    if (!isFirst && isLessThanMax && !this.data.is_in_welcome_range) {
      this.set({
        is_in_welcome_range: true
      });
    } else if ((isFirst || !isLessThanMax) && this.data.is_in_welcome_range) {
      this.set({
        is_in_welcome_range: false
      });
    }
  }

  verifyOTOChats() {
    if(_.size(this.data.activeRooms) > 0) {
      _.forOwn(this.data.activeRooms, (room, jid) => {
        if (utils.jid.is_private_chat(jid)) {
          // Close OTO chats when user is not in the roster
          if (!this.data.roster[jid]) {
            AppDispatcher.dispatch('close-room', {
              jid: jid
            });
          }
        }
      });
    }
  }

  handleConfigChange(data) {
    let config = _.mergeWith(this.data.config, data, (item1, item2, key) => {
      if (key === PreferencesKeys.AUTO_JOIN) {
        return item2;
      }
    });
    this.set({config});

    // TEMP -------
    this.handleHCInit(config, true);
    // END TEMP ---
  }

  resetFilesAndLinksFetching() {
    for (let jid in this.data.activeRooms){
      if (this.data.activeRooms[jid]) {
        this.data.activeRooms[jid].files_fetching = false;
        this.data.activeRooms[jid].links_fetching = false;
      }
    }
    for (let jid of this.local.closedChats){
      if (this.data.allRooms[jid]) {
        this.data.allRooms[jid].files_fetching = false;
        this.data.allRooms[jid].links_fetching = false;
      }
    }
  }

  fetchReadState() {
    logger.log('[ReadState] Fetching readstate data.');
    AppDispatcher.dispatch('DAL:fetch-readstate');
  }

  refetchReadState() {
    if (this.local.clearUnreadCounts) {
      this._clearPendingReadstateData();
    }
    this.fetchReadState();
  }

  handleReadState(err, data) {
    var activeRooms = this.data.activeRooms;

    if (err || !Array.isArray(data)) {
      logger.warn('[ReadState] Error fetching readstate. Reason:', err, data);
      this._resetPendingReadstateData();
      return;
    }

    logger.log(`[ReadState] Received readstate data for ${data.length} rooms:`, _.map(data, 'xmppJid'));
    _.forEach(data, (chat) => {
      let jid = chat.xmppJid;

      // Only remove rooms from readstate if the activeRooms object is populated
      // and the room is not present in it.
      if (!_.isEmpty(activeRooms) && !activeRooms[jid]) {
        logger.debug('[ReadState] Removing inactive room:', jid);
        this._removeReadState(jid);
        return;
      }


      let roomDefaults = _.pick(this.getRoomDefaults(), 'unreadCount', 'unreadMentionCount', 'unreadMentionJustMeCount', 'unreadCountTemp', 'hasMention'),
          roomData = _.pick(activeRooms[jid], 'unreadCount', 'unreadMentionCount', 'unreadMentionJustMeCount', 'unreadCountTemp', 'hasMention'),
          update = {
            isUpdatingUnreadCount: false,
            last_read_message: {
              mid: chat.mid,
              timestamp: Number(chat.timestamp)
            }
          };

      _.assign(update, roomDefaults, roomData);

      if ('unreadCount' in chat) {
        let unreadCount = chat.unreadCount.count || 0,
            mentionCount = chat.unreadCount.mentions || 0,
            hasMention = chat.unreadCount.includesMention;

        update.unreadCount = unreadCount + update.unreadCountTemp;
        update.unreadCountTemp = update.unreadCount;

        if (update.unreadCount && utils.jid.is_room(jid)) {
          update.hasMention = hasMention || update.hasMention;

          if (update.hasMention) {
            update.unreadMentionCount = mentionCount;

            // Readstate doesn't provide a breakdown by mention type. We know the the total number
            // of unread mentions but not how many of those are of the  @all or @here variety vs a
            // direct mention. Here we are setting the unreadMentionJustMeCount property to one to
            // indicate that there might be a notification-worthy unread message. Which is better
            // than leaving it set to zero.
            update.unreadMentionJustMeCount = 1;
          }
        }

        this.local.clearUnreadCounts = true;
      }

      _.assign(activeRooms[jid], update);
    });

    this._resetPendingReadstateData();
    this.handleChatsAbsentFromReadState(data.map(room => room.xmppJid));
    this.set('activeRooms', activeRooms);

    AppDispatcher.dispatch('readstate-received');
  }

  _clearPendingReadstateData() {

    _.forEach(this.data.activeRooms, (room) => {
      room.unreadCountTemp = 0;
      room.isUpdatingUnreadCount = true;
    });
    this.set('activeRooms', this.data.activeRooms);
  }

  _resetPendingReadstateData() {

    _.forEach(this.data.activeRooms, (room) => {
      room.unreadCountTemp = room.unreadCount;
      room.isUpdatingUnreadCount = false;
    });
    this.set('activeRooms', this.data.activeRooms);
  }

  handleChatsAbsentFromReadState(rooms) {
    for (var jid in this.data.activeRooms) {
      let chat = this.data.activeRooms[jid];

      if (chat && utils.jid.is_chat(jid) && rooms.indexOf(jid) === -1) {
        logger.debug('[ReadState] Adding active room:', jid);
        this.getLastMessageForChat(chat);
      }
    }
  }

  getLastMessageForChat(chat) {
    var jid = chat.jid,
        type = utils.jid.is_private_chat(jid) ? 'user' : 'room',
        id = utils.jid.is_private_chat(jid) ? utils.jid.user_id(jid) : chat.id,
        data = {
          jid: jid,
          path: {
            type: type,
            identifier: id
          }
        };

    if (id) {
      AppDispatcher.dispatch('API:fetch-last-message', data, this.addChatToReadState.bind(this));
    } else {
      this._updateReadState({ jid: data.jid });
    }
  }

  getLastClosedChat() {
    this.local.closedChats = _.filter(this.local.closedChats, (jid) => utils.jid.is_room(jid) ? jid in this.data.allRooms : jid in this.data.roster);
    return this.local.closedChats.shift();
  }

  addChatToReadState(data) {
    var msg = _.get(data, 'items[0]', {}),
        ts = utils.getTimestampFromIsoDate(msg.date),
        chat = this.data.activeRooms[data.jid];

    chat.most_recent_message = {
      mid: msg.id,
      timestamp: ts
    };
    chat.last_read_message = {...chat.most_recent_message};
    this.set('activeRooms', this.data.activeRooms);

    this._updateReadState({
      jid: data.jid,
      mid: msg.id,
      timestamp: ts
    });
  }

  resetReadStateCounts(chats) {
    logger.log('[ReadState] Marking chats as read', chats.map(chat => chat.jid));

    _.forEach(chats, (chat) => {
      if (chat.unreadCount) {
        this._clearUnreadCountForChat(chat.jid);
        this.getLastMessageForChat(chat);
      }
    });
  }

  /**
   * Gets the info for the room that is named after this group instance
   *
   * @returns {Object} roomInfo the room info object
   * @returns {String} roomInfo.jid the jid of the room
   * @returns {Object} roomInfo.room the room object if this room exists, or undefined if not
   */
  getGroupInstanceRoomInfo() {
    var conf = this.data.conference_server,
        groupName = this.data.group_name,
        groupId = this.data.group_id,
        jid = utils.jid.build_group_jid(groupName, groupId, conf);

    return {
      jid: jid,
      room: this.data.allRooms[jid]
    };

  }

  onBoardNewUser(activeSize) {
    // Fixes a bug for GROW-1687
    // we may consider removing when that experiment is complete
    var groupInstanceRoomInfo = this.getGroupInstanceRoomInfo(),
        room = groupInstanceRoomInfo.room;

    if (room && room.privacy === "public") {
      if (activeSize === 0) {
        AppDispatcher.dispatch("set-route", {
          jid: groupInstanceRoomInfo.jid
        });
      }
    } else {
      AppDispatcher.dispatch("set-route", {
        jid: 'lobby'
      });
    }
  }

  addChangeHandlers() {
    _.map(this.data, (obj, key) => {
      this.on('change:' + key, (changeset) => {
        AppDispatcher.dispatch('updated:' + key, changeset);
      });
    });
  }

  handleOpenRoom(data) {
    var jid = utils.jid.bare_jid(data.jid || data.from);

    if (utils.jid.is_private_chat(jid)) {
      this.joinPrivateChat(jid, utils.jid.user_id(jid));
      return;
    }

    var room = utils.fetch(this.data.allRooms[jid], {}),
        dontSelectRoom = _.get(data, "dontSelectRoom", false);

    room = _.assign({}, this.getRoomDefaults(), room, {
      presence: _.cloneDeep(this.getRoomDefaults().presence),
      type: 'groupchat',
      jid: jid
    });
    this.data.activeRooms[jid] = room;

    // If the room is opening as the result of an invite, fetch the
    // latest message from the API in order to start tracking readstate
    if (dontSelectRoom || room.jid !== this.data.active_chat) {
      this.getLastMessageForChat(room);
    }

    this.set({
      activeRooms: this.data.activeRooms,
      active_chat: dontSelectRoom ? this.data.active_chat : jid
    });

    this._clearUnreadCountForChat(jid);
  }

  handleJoinRoom({ room: roomName }) {

    let canBeUser = !roomName.indexOf('@');

    if (!roomName || roomName === "@"){
      return;
    }

    let chats;

    if (canBeUser){
      let mention = roomName.substr(1);
      chats = _.filter(this.data.roster, (user) => {
        return user.mention_name && user.mention_name === mention;
      });
    }

    if (_.isEmpty(chats)){
      let roomNameLowerCase = roomName.toLowerCase();
      chats = _.filter(this.data.allRooms, (room) => {
        return room.name && room.name.toLowerCase() === roomNameLowerCase;
      });
      if (chats.length > 1) {
        chats = _.filter(chats, (room) => {
          return room.name && room.name === roomName;
        });
      }
    }

    let chat = _.head(chats);

    if (chat) {
      if (chat.jid !== this.data.active_chat) {
        AppDispatcher.dispatch('set-route', { jid: chat.jid });
      }
    } else {
      AppDispatcher.dispatch('show-flag', {
        type: "warning",
        close: "auto",

        body: `${(canBeUser) ? "User" : "Room"} "${roomName}" not found.`
      });
    }
  }

  /**
   * We limit room presences to a minimal number initally and only consider the
   * participants list "fully initialized" in one of these cases:
   *
   * - All participants have been received.
   * - The HC server doesn't support participant limiting.
   * - Current user is a guest.
   * - Chat type is a 1-1
   *
   * This is for the purpose of mitigating a flood of room presences on initial
   * join of a room with many occupants.
   */
  initializeRoomParticipants(roomJid) {
    let room = this.data.activeRooms[roomJid];
    let includeOffline = utils.jid.is_private_room(room.privacy);

    if (room.participants_fully_initialized) {
      return;
    }

    if (!room.roster_size || room.roster_size <= AppConfig.initial_room_participants_limit) {
      this.setRoomParticipantsFullyInitialized(room);
    } else {
      if (this.data.active_chat === roomJid) {
        this.debouncedFetchRoomParticipantsFromAPI(room, includeOffline);
      }
    }
  }

  handleJoinedRooms(rooms) {
    utils.toArray(rooms).forEach((room) => {
      let activeRoom = this.data.activeRooms[room.jid];

      if (activeRoom) {
        activeRoom.show_join_leave_messages = true;
        activeRoom.roster_size = room.roster_size || 0;
        activeRoom.topic = room.topic;
        this.initializeRoomParticipants(room.jid);
      }
    });
  }

  handleOfflineChatsChanges(newJids, activeJids, lastSavedJids, activeChat){
    let modifiedOnOtherDevices = _.xor(lastSavedJids, newJids);
    let [closedOnOtherDevices, openedOnOtherDevices] = _.partition(modifiedOnOtherDevices, (jid) => {
      return _.includes(lastSavedJids, jid);
    });

    let modifiedOffline = _.xor(lastSavedJids, activeJids);
    let [closedOffline, openedOffline] = _.partition(modifiedOffline, (jid) => {
      return _.includes(lastSavedJids, jid);
    });

    let opened = _.union(openedOnOtherDevices, openedOffline);
    let closed = _.union(closedOnOtherDevices, closedOffline);

    logger.type('application-store:handle-offline-chats-changes').log({ opened, closed });

    // There is no need to close rooms of guest user because he/she has only one active room
    if (!ConfigStore.isGuest()) {
      this._closeRooms(closed);
    }

    this._openRooms(opened, activeChat);
  }

  /**
   * Dispatches closing room event for all rooms defined in collection sent via parameter
   * @param closed
   * @private
   */
  _closeRooms(rooms) {
    _.each(rooms, (jid) => {
      AppDispatcher.dispatch('close-room', {
        jid: jid,
        type: utils.room.detect_chat_type(jid)
      });
    });
  }

  /**
   * Dispatches opening room event for all rooms defined in collection sent via parameter
   * @param opened
   * @private
   */
  _openRooms(rooms, activeChat) {
    _.each(rooms, (jid) => {
      AppDispatcher.dispatch('open-room', {
        jid: jid,
        dontSelectRoom: true
      });
      AppActions.restoreRoomOrder(jid);
      if (jid === activeChat) {
        AppActions.navigateToChat(jid);
      }
      if (utils.jid.is_private_chat(jid)) {
        AppDispatcher.dispatch('request-profile', jid);
      }
    });
  }

  handleHCInit(data, isReconnect = false) {
    var uid,
        roomsArr = utils.toArray(_.uniq(_.cloneDeep(PreferencesStore.getAutoJoinRooms()))),
        rooms = {},
        roster = {};

    let autoJoin = _.get(data, ['preferences', 'autoJoin'], false),
        isFirstLogin = autoJoin && autoJoin.length < 2 && this._isFirstLogin(data.preferences),
        chatToFocus = isFirstLogin ? _.get(data, 'preferences.chatToFocus') : PreferencesStore.getChatToFocus(),
        newJids = _.map(roomsArr, 'jid'),
        activeJids = _.keys(this.data.activeRooms),
        newAndActiveJids = newJids.concat(activeJids),
        oldActiveChat = this.data.active_chat;

    logger.type('application-store:handle-hc-init').log('isFirstLogin:', isFirstLogin);
    logger.type('application-store:handle-hc-init').log('chatToFocus:', chatToFocus);

    if (!isFirstLogin || data.is_guest) {
      if (this.local.shouldReconcileAutoJoin) {
        this.local.shouldReconcileAutoJoin = false;
        logger.type('application-store:handle-hc-init').log('autoJoin reconciling started.');
        let lastSavedJids = _.map(this.local.lastSavedAutoJoin, 'jid');
        if (this.data.config.auth_method !== 'nonce') {
          AppDispatcher.registerOnce('after:configuration-change', () => {
            this.handleOfflineChatsChanges(newJids, activeJids, lastSavedJids, oldActiveChat);
          });
        } else {
          AppDispatcher.registerOnce('strophe-reconnected', () => {
            this.handleOfflineChatsChanges(newJids, activeJids, lastSavedJids, oldActiveChat);
          });
        }
      } else {
        logger.type('application-store:handle-hc-init').log('autoJoin reconciling skipped.');
      }

      _.forEach(roomsArr, (room) => {
        room.type = utils.jid.is_room(room.jid) ? 'groupchat' : 'chat';
        if (room.type === 'chat') {
          room.participants_fully_initialized = true;
          uid = utils.jid.user_id(room.jid);
          room.id = uid;
          if (!_.includes(this.local.participants, uid)) {
            this.local.participants.push(uid);
          }
          if (!_.includes(this.local.profile_jids, room.jid)) {
            this.local.profile_jids.push(room.jid);
          }
        }
        if (data.is_guest) {
          room.participants_fully_initialized = true;
        }

        let local_active_room = _.get(this.data, `activeRooms['${room.jid}']`, {});
        let local_room = _.get(this.data, `allRooms['${room.jid}']`, {});

        // not all clients save autoJoin list with names
        if (!room.name){
          room.name = local_active_room.name || local_room.name;
          logger.warn(`Room name isn't defined in the autoJoin list. Room jid: ${room.jid}`);
        }

        rooms[room.jid] = _.merge(
          this.getRoomDefaults(),
          _.omit(local_active_room, ['name']),
          room
        );
      });
    }

    var current_user = _.pick(data, [
      'user_jid',
      'jid',
      'user_id',
      'user_name',
      'mention',
      'title',
      'photo_large',
      'photo_small',
      'email',
      'is_admin',
      'is_guest',
      'guest_key',
      'presence',
      'user_created_utc'
      ]);
    current_user.user_jid = current_user.user_jid || current_user.jid;
    current_user.is_guest = current_user.is_guest ? true : false;

    if (PreferencesStore.getAutoJoinRooms() !== undefined){
      if (current_user.is_guest) {
        this.data.active_chat = data.room_jid;
        this.local.active_type = 'groupchat';
      } else if (isFirstLogin || !chatToFocus || newAndActiveJids.length && newAndActiveJids.indexOf(chatToFocus) === -1) {
        this.data.active_chat = 'lobby';
      } else {
        this.data.active_chat = chatToFocus;
        this.local.active_type = /@chat/.test(chatToFocus) ? 'chat' : 'groupchat';
      }
    }

    if (utils.jid.is_private_chat(this.data.active_chat)){
      AppDispatcher.dispatch('request-profile', this.data.active_chat);
    }

    if (utils.jid.is_chat(this.data.active_chat) && _.isEmpty(rooms)) {
      rooms[this.data.active_chat] = _.merge(
        this.getRoomDefaults(),
        {
          jid: this.data.active_chat,
          type: utils.jid.is_room(this.data.active_chat) ? 'groupchat' : 'chat'
        },
        this.data.allRooms[this.data.active_chat]
      );
      PreferencesStore.setAutoJoinRooms([{
        jid: rooms[this.data.active_chat].jid,
        name: rooms[this.data.active_chat].name
      }]);
    }

    this.set('ignoreAddIntegrationsGlance', _.get(data, 'preferences.ignoreAddIntegrationsGlance'));

    if (!isReconnect){
      roster[current_user.user_jid] = _.assign(this.getRosterDefaults(), {presence: {show: 'chat', status: ''}});
      if (current_user.is_guest){
        roster[data.user_jid]['mention_name'] = current_user.mention;
      }
      if (rooms[current_user.user_jid]) {
        rooms[current_user.user_jid].presence = current_user.presence = {
          show: 'chat',
          status: ''
        };
      }
    }

    let meDefaultMentions = _.reduce(AppConfig.core_mentions, (acc, core_mention) => {
      if (!core_mention.isUser) {
        acc = [].concat(acc, core_mention.mention_name);
      }
      return acc;
    }, []);

    let meDefaultMentionsRegex = meDefaultMentions ? '|' + meDefaultMentions.join('|') + '|' : '';
    this.data.mentionRegexMe = new RegExp('(?=[^\\w]|^)@(' + utils.escapeRegEx(data.mention) + meDefaultMentionsRegex + '"' + utils.escapeRegEx(data.user_name) + '")(?=[^\\w]|$)', "ig");
    this.data.mentionRegexJustMe = new RegExp('(?=[^\\w]|^)@(' + utils.escapeRegEx(data.mention) + "|" + '"' + utils.escapeRegEx(data.user_name) + '")(?=[^\\w]|$)', "ig");

    this.data.activeRooms = rooms;
    _.merge(this.data, {
      current_user: current_user,
      roster: roster,
      smileys: utils.emoticons.addSmileys(data.emoticons || [])
    });

    var features = data.features || this.data.features;

    this.setActiveGuestUserRegex();

    let dataForUpdate = {
      current_user: this.data.current_user,
      activeRooms: this.data.activeRooms,
      roster: this.data.roster,
      smileys: this.data.smileys,
      chat_server: data.chat_server,
      conference_server: data.conference_server,
      api_host: data.api_host,
      web_server: data.web_server,
      group_name: data.group_name,
      group_id: data.group_id,
      features: features,
      permissions: data.perms || {}
    };

    if (this.data.active_chat){
      if (!this.data.activeRooms[this.data.active_chat]) {
        this.data.active_chat = 'lobby';
      }
      dataForUpdate.active_chat = this.data.active_chat;
    }

    this.set(dataForUpdate);
    if (!this.local.initialized){
      this.local.lastSavedAutoJoin = roomsArr;
    }
    this.local.initialized = true;
    this.updatePresenceProcessor();
  }

  /*
   * Populate what we know about the autoJoin rooms from the startup IQ
   * into the allRooms & activeRooms lists. This way, everything on screen
   * is sufficiently populated when the preloader drops. See HC-29452
   */
  handleStartupIQAutoJoin(autoJoin) {
    autoJoin.forEach((item) => {
      if (utils.jid.is_room(item.jid)) {

        let owner = utils.jid.user_id(_.get(item, 'x.owner', null));
        let room = _.merge(
          this.getRoomDefaults(),
          this.data.allRooms[item.jid],
          this.data.activeRooms[item.jid],
          item.x,
          {
            jid: item.jid,
            type: 'groupchat',
            owner
          }
        );

        if (!_.includes(room.admins, owner)) {
          room.admins.push(owner);
        }

        this.data.allRooms[item.jid] = _.cloneDeep(room);
        this.data.activeRooms[item.jid] = _.cloneDeep(room);
      }
    });
  }

  handleServerData(data) {
    _.map(this.server_data_callbacks, (cb, evt) => {
      var thisData = data[evt];
      if (thisData) {
        cb(thisData, this, data.cached);
      }
    });
  }

  unsubscribeFromStanzas(type) {
    utils.toArray(type).forEach((stanza) => {
      this.server_data_callbacks[stanza] = (stz) => {
        _.noop(stz);
      };
    });
  }

  handleIQ(iq, store, fromCache) {
    store.iqProcessor.handleIQ.apply(store.iqProcessor, arguments);
  }

  handleInviteMessage(message) {
    var fromRoom = utils.jid.bare_jid(message.from),
        invite = _.get(message, 'x[0].invite', {}),
        reason = invite.reason || '',
        fromUser = invite.from || '',
        user_jid = utils.jid.bare_jid(fromUser),
        room = _.omit(_.get(message, 'x[1]'), 'xmlns'),
        roomName = room.name || '';

    if (!this.data.allRooms[fromRoom]) {
      this.data.allRooms[fromRoom] = _.assign(this.getRoomDefaults(), { jid: fromRoom }, room);
    }

    var inviteFromName = _.get(this.data, `roster["${user_jid}"].name`, '');
    if (utils.jid.is_room(fromUser)) {
      inviteFromName = utils.jid.resource(fromUser);
    }

    AppDispatcher.dispatch('open-room', {
      jid: fromRoom,
      dontSelectRoom: true
    });

    AppDispatcher.dispatch('show-modal-dialog', {
      dialog_type: 'room-invite-dialog',
      dialog_data: {
        bgDismiss: false,
        room_name: roomName,
        room_jid: fromRoom,
        from_user: inviteFromName,
        should_queue: true,
        reason: reason
      }
    });

    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.invite.room",
      properties: {
        isFromDory: (inviteFromName === 'HipChat')
      }
    });
  }

  handleRoomInviteAccepted(jid) {
    if (this.data.allRooms[jid]) {
      this.handleNewRoom(this.data.allRooms[jid]);
      AppDispatcher.dispatch('set-route', {jid: jid});
    }
  }

  handlePrivateChatInvite(message) {
    var jid, uid;
    if (message.from === this.data.current_user.user_jid) {
      jid = utils.jid.bare_jid(message.to);
    } else {
      jid = utils.jid.bare_jid(message.from);
    }
    uid = utils.jid.user_id(jid);
    this.joinPrivateChat(jid, uid);
  }

  handlePresence(presences, store) {
    store.presenceProcessor.handlePresence(presences);
  }

  handleMissedCall(msg) {
    this.handleIncomingMessages(msg, this);
  }

  handleCallDeclined(msg) {
    this.handleIncomingMessages(msg, this);
  }

  handleIncomingMessages(messages, store) {
    store.set({
      rawMessages: messages
    });
    var messagesObj = store.messageProcessor.processMessages(messages);
    messagesObj = _.groupBy(messagesObj, 'room');
    store.set({
      newMessages: messagesObj
    });
    store._handleNewMessageUpdate(messagesObj);
  }

  handleSendMessage(data) {
    let activeChat = utils.jid.is_chat(data.jid) ? this.data.activeRooms[data.jid] : null,
        currentTime = Date.now() / 1000;
    if (activeChat){
      // user's local time is incorrect
      if (_.get(activeChat, 'most_recent_message.timestamp', 0) > currentTime){
        data.time = activeChat.most_recent_message.timestamp + 1;
      } else {
        data.time = currentTime;
      }
      let msg = this.messageProcessor.processSentMessage(data);
      this.local.user_state = 'active';
      this.local.sent_msg_ids.push(data.id.toString());
      this.set({
        newMessages: _.groupBy(msg, 'room')
      });
    }
  }

  _handleNewMessageUpdate(messageData) {
    var activeChat = utils.jid.is_chat(this.data.active_chat) ? this.data.activeRooms[this.data.active_chat] : null,
        hasChanges = false;

    _.forEach(messageData, (messages, jid) => {
      _.forEach(this.data.activeRooms, (chat) => {
        if (chat.jid !== jid){ return; }

        _.forEach(messages, (msg) => {
          this._updateMostRecentMessage(chat, msg);
          if (msg.is_echo) {
            this._updateReadStateForChat(chat);
          } else if (this._msgIsTopicChange(msg)) {
            return;
          }
          hasChanges = true;

          if (this._msgShouldNotUpdateBadge(msg)){ return; }

          if (chat && !msg.is_history_message && msg.type !== 'user_state') {
            ++chat.unreadCount;
            ++chat.unreadCountTemp;

            if (utils.isFormattedMessage(msg)){
              return;
            }

            if (this._shouldUpdateMentionFromCard(this.data.mentionRegexMe, msg) || (msg.body && msg.body.search(this.data.mentionRegexMe) !== -1 || utils.jid.is_private_chat(chat.jid))) {
              chat.hasMention = true;
              ++chat.unreadMentionCount;
              if (this._shouldUpdateMentionFromCard(this.data.mentionRegexJustMe, msg) || (msg.body && msg.body.search(this.data.mentionRegexJustMe) !== -1)) {
                ++chat.unreadMentionJustMeCount;
              }
              return;
            }
          }
        });
      });
    });

    if (activeChat && this._msgShouldUpdateReadState(activeChat.most_recent_message)) {
      this._updateReadStateForActiveChat();
      hasChanges = true;
    }

    if (hasChanges) {
      this.set('activeRooms', this.data.activeRooms);
      this._updateTotalUnreadCount();
    }
  }

  _shouldUpdateMentionFromCard(regex, msg) {
    return _.has(msg, 'card.activity.html')
        && msg.card.activity.html.indexOf("hc-mention-user") !== -1
        && regex.test(msg.card.activity.html);
  }

  _updateMostRecentMessage(chat, msg) {
    var most_recent = chat.most_recent_message || {};

    if (msg.is_presence_message || !utils.validateMID(msg.mid)) {
      return;
    }

    if (!most_recent.timestamp || msg.time > most_recent.timestamp) {
      chat.most_recent_message = {
        mid: msg.mid,
        timestamp: msg.time
      };
    }
  }

  _msgShouldUpdateReadState(msg) {
    var user_jid = this.data.current_user.user_jid,
        user = this.data.roster[user_jid],
        user_presence = user ? user.presence : null;

    var isAppFocused = this.local.windowFocused,
        isChat = utils.jid.is_chat(this.data.active_chat),
        isSender = msg ? user_jid === msg.sender : false,
        isAvailable = user_presence && user_presence.show !== Presence.IDLE;

    return (isAppFocused && isChat && (isSender || isAvailable));
  }

  _msgIsTopicChange(msg) {
    // if subject prop exists this is a room topic change
    return !!msg.subject;
  }

  _updateReadStateForActiveChat() {
    var ac = this.data.active_chat;
    if (ac && utils.jid.is_chat(ac) && this.data.activeRooms[ac]) {
      this._updateReadStateForChat(this.data.activeRooms[ac]);
    }
  }

  _updateReadStateForChat(chat) {
    var most_recent = chat.most_recent_message,
        last_read = chat.last_read_message,
        data = {
          jid: chat.jid
        };

    // if we have both a most_recent_message and a last_read_message, and the timestamp
    //   of the last_read_message is newer, there's nothing to do.
    if (most_recent && last_read && most_recent.timestamp <= last_read.timestamp) {
      return;
    }

    // if we don't have a most_recent_message and a last_read_message, the chat is empty
    //   but we need to inform the readstate endpoint to start tracking unread messages.
    if (!most_recent && !last_read) {
      chat.last_read_message = {};
      this._updateReadState(data);
      return;
    }

    // if we don't have a most_recent_message but the last_read_message is truthy, we've
    //   already opened this chat before, so there's nothing to do.
    if (!most_recent && last_read) {
      return;
    }

    // if we have a newer most_recent_message, we need to update readstate
    //   with the newer message
    chat.last_read_message = {...most_recent};
    data.mid = most_recent.mid;
    data.timestamp = most_recent.timestamp;

    this._updateReadState(data);
  }

  _updateReadState(data) {
    if (data && utils.jid.is_chat(data.jid)) {
      AppDispatcher.dispatch('DAL:update-readstate', data);
    }
  }

  _removeReadState(jid) {
    if (utils.jid.is_chat(jid)) {
      AppDispatcher.dispatch('DAL:remove-readstate', { jid });
    }
  }

  _clearUnreadCountForChat(jid){
    var result = this._clearUnreadCount(jid);

    if (result){
      this.set('activeRooms', this.data.activeRooms);
      this._updateTotalUnreadCount();
    }
  }

  _clearUnreadCount(jid){
    if (!utils.jid.is_chat(jid)){
      return false;
    }

    var chat = this.data.activeRooms[jid],
        room = this.data.allRooms[jid];

    if (chat){
      let defaults = _.pick(this.getRoomDefaults(), 'unreadCount', 'unreadCountTemp', 'unreadMentionCount', 'unreadMentionJustMeCount', 'hasMention'),
          exists = _.pick(chat, 'unreadCount', 'unreadCountTemp', 'unreadMentionCount', 'unreadMentionJustMeCount', 'hasMention');

      if (!_.isEqual(exists, defaults)){
        this.data.activeRooms[jid] = _.assign({}, chat, defaults);
        if (room && utils.jid.is_room(jid)) {
          this.data.allRooms[jid] = _.assign({}, room, defaults);
        }
        return true;
      }
    }

    return false;
  }

  _updateTotalUnreadCount() {
    let {notifyForRoom,
      notifyForPrivateRoom,
      notifyForPrivate,
      notifyForTag,
      roomNotificationOverrides = {}} = PreferencesStore.getAll();

    let perRoomNotificationsEnabled = _.get(this.data.config, 'feature_flags.web_client_per_room_notifications', false);
    let globalNotificationLevel = PreferencesStore.getGlobalNotificationSetting();

    let hasMention = false;
    let unreadTotal = _.reduce(this.data.activeRooms, function(sum, chat) {
      let isPrivateChat = utils.jid.is_private_chat(chat.jid);

      if (isPrivateChat) {
        if (chat.unreadCount) {
          hasMention = true;
        }

        if (notifyForPrivate) {
          return sum + chat.unreadCount;
        }

      } else { //it's groupchat
        if (chat.hasMention) {
          hasMention = true;
        }

        // check using new per-room notification settings
        if (perRoomNotificationsEnabled) {
          // check if there is notification level for room or use global level as default
          let notificationLevel = _.get(roomNotificationOverrides[chat.jid], 'level', globalNotificationLevel);

          switch (notificationLevel) {
            case "quiet":
              return sum + chat.unreadMentionJustMeCount;
            case "normal":
              return sum + chat.unreadMentionCount;
            case "loud":
            default:
              return sum + chat.unreadCount;
          }
        }

        // check using old notification settings
        if (utils.jid.is_public_room(chat.privacy)) {
          if (notifyForRoom) {
            return sum + chat.unreadCount;
          } else if (notifyForTag) {
            return sum + chat.unreadMentionCount;
          }
        } else if (utils.jid.is_private_room(chat.privacy)) {
          if (notifyForPrivateRoom) {
            return sum + chat.unreadCount;
          } else if (notifyForTag) {
            return sum + chat.unreadMentionCount;
          }
        }
      }

      return sum;
    }, 0);

    AppActions.updateTotalUnreadCount(unreadTotal, hasMention);
  }

  _msgShouldNotUpdateBadge(msg) {
    var xData = (_.isArray(msg.x) && msg.x.length) ? msg.x[0] : false,
        doNotNotify = (_.get(xData, "notify") === "0");

    return (doNotNotify || msg.delay || (msg.room === this.data.active_chat && this.local.windowFocused) || msg.sender === this.data.current_user.user_name);
  }

  /*
   * Only react to chatstate messages when they are sent from ourself.
   * This happens when:
   * 1. We're opening/closing a private chat with ourself
   *   (message.from will be our jid)
   * 2. We've joined/left a private chat in another open client
   *   (message.delay.from_jid will exist, and be our jid)
   */
  handleChatStateMessage(data) {
    var jid = utils.jid.bare_jid(_.get(data, 'message.from')),
        chat = this.data.activeRooms[jid],
        sender = utils.jid.bare_jid(_.get(data, 'message.delay.from_jid', jid)),
        uid = utils.jid.user_id(jid);
    if (this.data.current_user.user_jid === sender && utils.jid.is_private_chat(jid)) {
      if (!chat && data.type === 'active') {
        this.joinPrivateChat(jid, uid);
      } else if (chat && data.type === 'gone') {
        this.handleCloseRoom(jid);
      }
    }
  }

  handleConnectionSuccess(connection, store) {}

  handleEmoticons(query, type) {
    let items = query.item ? utils.toArray(query.item) : [],
        emoticons = type === 'result' ? {} : _.cloneDeep(this.data.emoticons.icons);

    emoticons = utils.emoticons.addBulk(items, emoticons);

    if (query.path_prefix && utils.emoticons.path_prefix !== query.path_prefix) {
      utils.emoticons.path_prefix = query.path_prefix;
    }

    let oldEmoticons = _.keys(this.data.emoticons.icons).sort(),
        newEmoticons = _.keys(emoticons).sort(),
        hasChanges = !_.isEqual(oldEmoticons, newEmoticons);

    if (hasChanges) {
      this.set({
        emoticons: {
          path_prefix: query.path_prefix,
          icons: emoticons
        }
      });
    }

    if (this.local.emoticons_initialized){
      if (hasChanges) {
        this._replaceEmoticonsIfRequired();
      }
    } else {
      this.local.emoticons_initialized = true;
    }
  }

  _replaceEmoticonsIfRequired() {
    if (PreferencesStore.shouldReplaceTextEmoticons() && this.data.rawMessages) {
      this.handleIncomingMessages(this.data.rawMessages, this);
    }
  }

  handleRoster(roster) {
    // roster being object means that this event is that user joined to group and now roster is it's object
    var newUser = null;
    if (_.isPlainObject(roster)) {
      newUser = roster;
    }
    let updatedRoster = [],
        verifyOTOChats = false;
    utils.toArray(roster)
      .filter(val => !!val)
      .forEach(user => {
        let id = _.get(user, "id"),
            jid = _.get(user, "jid");
        if (_.get(user, "subscription") === "remove" && (jid || id)) {
          // Handle Deleted User
          let deleted_user = _.get(this.data, `roster['${jid}']`) || _.find(this.data.roster, { id });
          if (deleted_user) {
            deleted_user.deleted = true;
          }
          jid = jid || deleted_user.jid;
          AppDispatcher.dispatch('room-deleted', {
            jid
          });
          verifyOTOChats = true;
        } else {
          user.display_name = user.name;
          user.id = user.id ? user.id : utils.jid.user_id(user.jid);
          updatedRoster.push(user);
        }
      });
    this.data.roster = _.omitBy(this.data.roster, (item) => {
      return item.deleted;
    });
    let rosterObj = _.keyBy(updatedRoster, (user) => {
      if (!this.data.roster[user.jid]) {
        _.assign(user, (user.jid === this.data.current_user.user_jid ? {presence: {show: 'chat', status: ''}} : this.getRosterDefaults()));
      }
      return user.jid;
    });

    let oldRosterSize = _.size(this.data.roster),
        newRosterData = _.merge(this.data.roster, rosterObj),
        newRosterDataSize = _.size(newRosterData);

    this.set('roster', newRosterData);

    let userJoinedNotificationEnabled = _.get(this.data.config, 'feature_flags.web_client_user_joined_notification', false);

    if (userJoinedNotificationEnabled &&
        newUser &&
        newRosterDataSize > oldRosterSize &&
        newRosterDataSize <= AppConfig.max_users_in_group_join_notification) {

      var flagId = `user-joined-flag-${utils.now()}`;
      FlagActions.showFlag({
        id: flagId,
        type: "success",
        body: this._flagBodyForUserJoinedEvent(newUser.jid, newUser.display_name, flagId),
        close: "manual"
      });
    }

    this.updateMentionNames();
    this.updateRosterNames();
    if (verifyOTOChats) {
      this.verifyOTOChats();
    }

    this._handleWelcomeRange(_.toArray(newRosterData).length);
  }

  _setRouteToUser(jid, flagId) {
    return (e) => {
      e.preventDefault();
      AppDispatcher.dispatch("set-route", { jid });
      FlagActions.removeFlag(flagId);
    };
  }

  _flagBodyForUserJoinedEvent(jid, displayName, flagId) {
    return () => (
      <div>
        <b dangerouslySetInnerHTML={{__html: DialogStrings.user_joined(displayName)}}/>
        <span> </span>
        <a href="#" onClick={this._setRouteToUser(jid, flagId)}>{DialogStrings.user_joined_link}</a>
      </div>
    );
  }

  updateMentionNames(){
    let isGuest = this.data.current_user.is_guest;
    let mentionNames = _.map(this.data.roster, (user) => {
      // Skip Guest Users (they do not have a subscription)
      if (('subscription' in user) && !isGuest ||
          // highlight users mentions in the guest mode
          !/Guest$/.test(user.mention_name) && isGuest) {
        return user.mention_name;
      }
    });

    mentionNames = _.reject(mentionNames, _.isEmpty);

    let index = mentionNames.indexOf(this.data.current_user.mention);
    if (index !== -1){
      mentionNames.splice(index, 1);
    }
    let userMentions = _.filter(AppConfig.core_mentions, {isUser: true});
    let userDefaultMentions = _.map(userMentions, 'mention_name');

    var userDefaultMentionsRegex = userDefaultMentions ? userDefaultMentions.join('|') : '';
    this.set({
      mentionRegexUser: new RegExp('(?=[^\\w]|^)@(' + (mentionNames.length ? mentionNames.join('|') + '|' + userDefaultMentionsRegex : userDefaultMentionsRegex) + ')(?=[^\\w]|$)', 'gi')
    });
  }

  updateGuestMentions(jid) {
    var room = this.data.activeRooms[jid],
        guestMentionNames,
        guestRegex;
    if (room && _.get(room, "participants.guests")) {
      guestMentionNames = _.map(room.participants.guests, (guest_jid) => {
        if (this.data.roster[guest_jid]) {
          return this.data.roster[guest_jid].mention_name;
        }
      });
      guestRegex = new RegExp('(?=[^\\w]|^)@(' + (guestMentionNames && guestMentionNames.length ? guestMentionNames.join('|') : '') + ')(?=[^\\w]|$)', 'gi');
      room.guest_mention_regex = guestRegex;
      this.set({
        activeRooms: this.data.activeRooms
      });
      this.setActiveGuestUserRegex();
    }
  }

  updateRosterNames() {
    var name_map = _.transform(this.data.roster, function(result, user) {
      result[user.mention_name] = user.name;
    });
    var mentionNames = {};
    _.forEach(AppConfig.core_mentions, function (val) {
      mentionNames[val.mention_name] = val.name;
    });
    utils.roster_names = _.merge(name_map, mentionNames);
  }

  handleProfile(iq) {
    let jid = utils.jid.bare_jid(iq.from);
    this.data.profiles[jid] = iq.query;
    let rosterItem = _.get(this.data, ['roster', jid]);
    if (rosterItem) {
      rosterItem.name = _.get(iq, ['query', 'name']);
    }
    this.set('profiles', this.data.profiles);
  }

  /**
   * @param {ChatFilesResponse} response
   */
  handleFileQueryResponse(response) {
    let jid = response.jid;
    if (this.data.activeRooms[jid]) {
      let current = this.data.activeRooms[jid].files || [];
      let files = _.orderBy(current.concat(response.files), 'date', 'desc');
      let uniqFiles = _.uniqBy(files, 'url');
      this.data.activeRooms[jid].files = _.map(uniqFiles, (file) => {
        file.user_name = file.user_name || utils.user.get_user_name(this.data.roster, file.group_id, file.user_id);
        file.icon_class = file.icon_class || utils.file.get_icon_class(file.name);
        return file;
      });

      this.data.activeRooms[jid].all_files_fetched = response.end;
      this.data.activeRooms[jid].files_fetched = true;
      this.data.activeRooms[jid].files_fetching = false;
      this.set('activeRooms', this.data.activeRooms);
      AppDispatcher.dispatch('files-fetched', { jid });
    }
  }

  /**
   * Fired by the message processor when parsing a file out of a received
   * message. The message could be new or from history, so need to re-sort
   * the list after adding the link to ensure proper sent order
   */
  addFileFromMessageToRoom(jid, file) {
    if (this.data.activeRooms[jid]) {
      let files = this.data.activeRooms[jid].files || [];
      files = [file, ...files];
      files = _.orderBy(files, 'date', 'desc');
      files = _.uniqBy(files, 'url');
      this.data.activeRooms[jid].files = files;
      this.debouncedSetActiveRooms();
    }
  }

  /**
   * @param {ChatLinksResponse} response
   */
  handleLinkQueryResponse(response) {
    let jid = response.jid;
    if (this.data.activeRooms[jid]) {
      let current = this.data.activeRooms[jid].links || [];
      let links = current.concat(response.links);
      let sortedLinks = _.orderBy(links, 'date', 'desc');
      let uniqLinks = _.uniqBy(sortedLinks, 'url');

      this.data.activeRooms[jid].links = _.map(uniqLinks, (link) => {
        link.user_name = link.user_name || utils.user.get_user_name(this.data.roster, link.group_id, link.user_id);
        link.display_url = link.display_url || link.url.replace(/.*?:\/\//g, "");
        return link;
      });

      this.data.activeRooms[jid].all_links_fetched = response.end;
      this.data.activeRooms[jid].links_fetched = true;
      this.data.activeRooms[jid].links_fetching = false;
      this.set('activeRooms', this.data.activeRooms);
      AppDispatcher.dispatch('links-fetched', { jid });
    }
  }

  /**
   * Fired by the message processor when scraping a link out of a received
   * message. The message could be new or from history, so need to re-sort
   * the list after adding the link to ensure proper sent order
   */
  addLinkFromMessageToRoom(jid, link) {
    if (this.data.activeRooms[jid]) {
      let links = this.data.activeRooms[jid].links || [];
      let sortedLinks = _.orderBy([].concat(link, links), 'date', 'desc');
      this.data.activeRooms[jid].links = _.uniqBy(sortedLinks, 'url');
      this.debouncedSetActiveRooms();
    }
  }

  joinPrivateChat(jid, uid) {
    this.data.activeRooms[jid] = {
      jid: jid,
      id: uid,
      name: _.get(this.data.roster, [jid, 'name'], 'Unknown'),
      type: 'chat',
      presence: _.get(this.data.roster, [jid, 'presence']) || {
        show: '',
        status: ''
      },
      files: [],
      links: [],
      history_fetch_ids: [],
      unreadCount: 0,
      unreadMentionCount: 0,
      unreadMentionJustMeCount: 0,
      hasMention: false
    };
    if (this.local.participants.indexOf(uid) === -1) {
      this.local.participants.push(uid);
    }
    AppDispatcher.dispatch('request-profile', jid);
    this.set('activeRooms', this.data.activeRooms);
  }

  handleRooms(rooms, cachedCall = false){
    rooms = utils.toArray(rooms);
    let deletedRoomJids = [];

    var allRoomsArray = _.reduce(rooms, (roomsAccumulatedArr, room) => {
      var roomInfo = {};

      if (room) {
        if (room.is_deleted) {
          deletedRoomJids.push(room.jid);
        } else if (room.id && !room.jid){
          const inActiveRooms = _.find(_.values(this.data.activeRooms), { id: room.id }),
                inAllRooms = _.find(_.values(this.data.allRooms), { id: room.id }),
                filtered = inActiveRooms || inAllRooms;
          if (filtered){
            const { jid, name } = filtered;
            AppDispatcher.dispatch('close-room', { jid });
            deletedRoomJids.push(jid);
            if (inActiveRooms){
              AppDispatcher.dispatch('show-flag', {
                type: "info",
                body: `${ChatPanelStrings.you_have_been_removed} "${name}"`,
                close: "auto"
              });
            }
            logger.type('application-store:handle-rooms').log(`Active room was closed because user was removed from that room. jid: ${jid}`);
          }
        } else {
          let activeRoom = this.data.activeRooms[room.jid] || {};

          // construct room properties from room defaults, data we have
          // already and room stanza data (which gets flattened)
          roomInfo = _.assign({}, this.getRoomDefaults(), activeRoom, room.x, {
            jid: room.jid,
            name: room.name
          });

          // update room object in activeRooms collection
          if (this.data.activeRooms[room.jid]) {
            this.data.activeRooms[room.jid] = roomInfo;

            if (utils.jid.is_room(room.jid) && !_.includes(roomInfo.admins, roomInfo.owner)) {
              this.addRoomAdmin(room.jid, roomInfo.owner);
            }
          }

          roomsAccumulatedArr.push(roomInfo);
        }
        return roomsAccumulatedArr;
      }
    }, []),

    allRoomsObj = _.keyBy(allRoomsArray, 'jid');

    // remove the deleted rooms from both of our rooms lists
    let allRooms = _.omit(this.data.allRooms, deletedRoomJids),
        activeRooms = _.omit(this.data.activeRooms, deletedRoomJids);

    this.set({
      allRooms: _.assign(allRooms, allRoomsObj),
      activeRooms: activeRooms
    });
  }

  determineRoomUpdate(room) {
    if (room.status === 'deleted') {
      this.handleRoomDelete(room);
      return;
    }
    var is_new_room = !this.data.allRooms[room.jid];
    if (is_new_room) {
      this.handleNewRoom(room);
    }
    this.handleRoomUpdate(room);
  }

  /**
   * Handles what to do when a new room push is received
   *
   * @param {object} room the room to join
   */
  handleNewRoom(room){
    var room_data = this.getRoomDefaults();
    room_data.type = utils.room.detect_chat_type(room.jid);
    this.data.allRooms[room.jid] = _.assign(room_data, room);
    if (!room_data.admins) {
      room_data.admins = [];
    }
    room_data.admins.push(room.owner);
    this.set({
      allRooms: this.data.allRooms
    });
  }

  handleRoomUpdate(room) {
    this.data.allRooms[room.jid] = _.merge(this.data.allRooms[room.jid], room);
    if (this.data.activeRooms[room.jid]) {
      this.data.activeRooms[room.jid] = _.merge(this.data.activeRooms[room.jid], room);
    }
    this.set({
      allRooms: this.data.allRooms,
      activeRooms: this.data.activeRooms
    });
    this._updateTotalUnreadCount();
  }

  handleRoomDelete(room){
    var deleted_room_id = (this.data.allRooms[room.jid]) ? this.data.allRooms[room.jid].id : room.id;
    delete this.data.allRooms[room.jid];
    if (this.data.activeRooms[room.jid]) {

      /*
       * If I took the action to delete the room, it's jid will exist in the local deletedRooms list
       * (see registered handler for 'delete-room' up above). Therefore, don't show me the generic
       * "admin deleted the room" flag since I'll already be looking at the confirmation flag.
       */
      if (room.jid === this.data.active_chat && !_.includes(this.local.deletedRooms, room.jid)) {
        AppDispatcher.dispatch('show-flag', {
          type: "info",
          close: "auto",
          body: '"' + this.data.activeRooms[room.jid].name + '" was deleted by the admin.'
        });
      }

      AppDispatcher.dispatch('close-room', {
        jid: room.jid,
        doNotNotifyHC: true,
        id: deleted_room_id
      });
    }
    AppDispatcher.dispatch('room-deleted', {
      jid: room.jid,
      id: deleted_room_id
    });
    this.set({
      allRooms: this.data.allRooms,
      activeRooms: this.data.activeRooms
    });
    this._updateTotalUnreadCount();
    _.pull(this.local.deletedRooms, room.jid);
  }

  handleCloseRoom(jid) {
    AppDispatcher.dispatch('room-closed', {
      jid: jid
    });
    delete this.data.activeRooms[jid];
    delete this.data.newMessages[jid];

    this._resetFiles(jid);
    this._resetLinks(jid);

    if (utils.jid.is_private_chat(jid) && this.data.roster[jid]){
      this.data.roster[jid].closed_at = utils.getMoment();
    }
    this.set({
      activeRooms: this.data.activeRooms,
      roster: this.data.roster
    });
    this.local.closedChats = [].concat(jid, _.pull(this.local.closedChats, jid));
    this._updateTotalUnreadCount();
    this._removeReadState(jid);
  }

  _resetFiles(jid){
    if (this.data.allRooms[jid]){
      this.data.allRooms[jid].files = [];
      this.data.allRooms[jid].all_files_fetched = false;
      this.data.allRooms[jid].files_fetched = false;
      this.data.allRooms[jid].files_fetching = false;
    }
  }

  _resetLinks(jid){
    if (this.data.allRooms[jid]){
      this.data.allRooms[jid].links = [];
      this.data.allRooms[jid].all_links_fetched = false;
      this.data.allRooms[jid].links_fetched = false;
      this.data.allRooms[jid].links_fetching = false;
    }
  }

  addVisitor(data) {
    var participantExistsInRoster = !!this.data.roster[data.participant];
    var participantExistsInRoom = !!this.data.activeRooms[data.participant];

    if (!participantExistsInRoster || !participantExistsInRoom) {
      this.data.roster[data.participant] = {
        mention_name: data.user_mention || _.get(this.data.roster[data.participant], 'mention_name'),
        name: data.user_name,
        jid: data.participant
      };
      this.addRoomParticipant({
        room: data.room,
        user_jid: data.participant,
        user_id: utils.jid.user_id(data.participant),
        role: 'visitor',
        affiliation: ''
      });

      this.updateParticipantStatusInRoster(data);
      this.updateGuestMentions(data.room);
    }

    this.data.roster[data.participant].presence = {
      show: data.presence.show || 'chat',
      status: data.presence.status
    };

    this.set('roster', this.data.roster);
  }

  updateParticipantStatusInRoster(data) {
    let currentRoom = this.data.activeRooms[data.room];

    if (currentRoom) {
      let guests = _.get(currentRoom, 'participants.guests', []);

      if (guests.some((el) => el === data.participant)) {
        this.data.roster[data.participant].is_guest = true;
      }
    }
  }

  removeVisitor(data) {
    if (this.data.roster[data.participant]) {
      delete this.data.roster[data.participant];
      this.set("roster", this.data.roster);
      this.updateGuestMentions(data.room);
    }
  }

  handleRoomPresence(data) {
    if (this.data.activeRooms[data.room]) {
      this.addRoomParticipant(data);
      this.updateMessagesIfGuestsConnected(data.room);
    }
  }

  updateMessagesIfGuestsConnected(room_jid) {
    if (!room_jid) { return; }
    else if (!_.isEmpty(_.get(this.data.activeRooms[room_jid], `participants.guests`, []))){
      this.messageProcessor.updateMessagesIfGuestsConnected(this.data.newMessages[room_jid]);
      this.set('newMessages', this.data.newMessages);
    }
  }

  handleGlobalPresence(data) {
    var person,
        chat;
    _.forOwn(data, (pres, jid) => {
      person = this.data.roster[jid];
      chat = this.data.activeRooms[jid];
      if (person) {
        if (jid !== this.data.current_user.user_jid || (jid === this.data.current_user.user_jid && _.includes(["away", "chat", "dnd", "xa"], pres.show))) {
          _.assign(person.presence, pres);
        }
      }
      if (chat) {
        _.assign(chat.presence, pres);
      }
    });
    this.set({
      activeRooms: this.data.activeRooms,
      roster: this.data.roster
    });
  }

  addRoomParticipantFromAPI(room, participant) {

    if (utils.jid.is_public_room(room.privacy) && !participant.is_present_in_room) {
      // The API appears to be returning users in public rooms marked as not present
      // this should never happen for a public room.
      return;
    }

    if (utils.room.is_guest(participant)) {

      if (!this.data.roster[participant.jid]) { // if guest not in the roster add them
        this.data.roster[participant.jid] = participant;
        this.set('roster', this.data.roster);
      }

      if(!_.includes(room.participants.guests, participant.jid)) {
        room.participants.guests.push(participant.jid);
        this.updateGuestMentions(room.jid);
      }

    } else {

      if (!_.includes(room.participants.members, participant.jid)) { // member
        room.participants.members.push(participant.jid);
      }

    }

    if (utils.room.is_admin(participant) && !_.includes(room.admins, participant.id)) {
      room.admins.push(participant.id);
    }

    if (!_.includes(this.local.participants, participant.id)) {
      this.local.participants.push(participant.id);
    }
  }

  addRoomParticipant(data) {
    var room = this.data.activeRooms[data.room];
    var arr = (data.role === 'visitor' ? room.participants.guests : room.participants.members);
    var isNotInParticipantList = arr.indexOf(data.user_jid) === -1;
    if (isNotInParticipantList) {
      arr.push(data.user_jid);

      if (data.type === "unavailable" && utils.user.is_admin(room.admins, room.owner, this.data.current_user)) {
        this.roomParticipantNotification(data, "add");
      } else {
        this.roomParticipantNotificationTimer(room, data, "join");
      }
    }

    if (room.privacy === 'private') {
      AppDispatcher.dispatch('unmark-participant', {
        room: data.room,
        user: data.user_jid
      });
    }

    if ((data.affiliation === "owner" || data.affiliation === "admin") &&
         !_.includes(room.admins, data.user_id)) {
      this.addRoomAdmin(data.room, data.user_id);

    }
    if (this.data.current_user.is_guest && !this.data.roster[data.user_jid]) {
      //The following block is to add a roster item from a room presence. Guests don't have the full roster,
      //and need to add users to it piecemeal as room presences come in
      AppDispatcher.dispatch('request-profile', data.user_jid, (resp) => {
        if (resp.query) {
          this.handleGuestRoomParticipants(_.merge(data, resp.query));
          this.debouncedSetActiveRooms();
        }
      });
    }
    this.debouncedSetActiveRooms();
    if (this.local.participants.indexOf(data.user_id) === -1) {
      this.local.participants.push(data.user_id);
    }
  }

  removeRoomParticipant(data) {
    var room = this.data.activeRooms[data.room];
    if (room) {
      if (room.participants[data.role]) {

        if (data.role === "guests") {
          this.roomParticipantNotification(data, "leave");
          this.removeVisitor(data);
        } else {
          this.roomParticipantNotificationTimer(room, data, "leave");
        }

        if (room.privacy === 'private' && data.role !== 'guests') {
          AppDispatcher.dispatch('mark-participant-unknown', {
            room: data.room,
            user: data.participant,
            role: data.role
          });
        } else {
          _.remove(room.participants[data.role], function (i) {
            return i === data.participant;
          });
        }
      } else if (data.role === "none") {
        if (utils.user.is_admin(room.admins, room.owner, this.data.current_user)) {
          this.roomParticipantNotification(data, "remove");
        }

        // Remove Members
        _.remove(room.participants.members, function (user_jid) {
          return user_jid === data.participant;
        });

        // Remove Guests
        _.forEach(room.participants.guests, (user_jid) => {
          if (user_jid === data.participant) {
            this.removeVisitor(data);
          }
        });
      }
      this.debouncedSetActiveRooms();
    }
  }

  handleUserRemoved(data) {
    // User Being removed from a room
    this.removeRoomParticipant({
      room: data.room,
      participant: data.user_jid,
      role: data.role
    });

    let user_id = Number(_.get(this.data.current_user, 'user_id') || _.get(this.data.current_user, 'id'));

    if (this.data.allRooms[data.room]
        && this.data.activeRooms[data.room].owner !== user_id
        && data.user_jid === this.data.current_user.user_jid) {
      if (this.data.activeRooms[data.room]) {
        AppDispatcher.dispatch('show-flag', {
          type: "info",
          body: `${ChatPanelStrings.you_have_been_removed} "${this.data.activeRooms[data.room].name}"`,
          close: "auto"
        });
        AppDispatcher.dispatch('close-room', {
          jid: data.room
        });
      }
      AppDispatcher.dispatch('room-deleted', {
        jid: data.room
      });
      delete this.data.allRooms[data.room];
      this.set({
        allRooms: this.data.allRooms
      });
    }
  }

  roomParticipantNotificationTimer(room, data, type) {
    if (!room.show_join_leave_messages) {
      return;
    }

    let user = data.participant || data.user_jid,
        key = room.jid + user;

    if (type === 'join') {
      if (this.local.presence_updates_timers[key]) {
        clearTimeout(this.local.presence_updates_timers[key]);
      } else {
        this.roomParticipantNotification(data, type);
      }
    } else {
      clearTimeout(this.local.presence_updates_timers[key]);
      this.local.presence_updates_timers[key] = setTimeout(() => {
        delete this.local.presence_updates_timers[key];
        this.roomParticipantNotification(data, type);
      }, AppConfig.leave_room_message_confirmation_timeout);
    }
  }

  roomParticipantNotification(data, notificationType) {
    var user_jid = data.participant || data.user_jid || data.jid,
        user = this.data.roster[user_jid];

    if (PreferencesStore.getHidePresenceMessages() || !user) {
      return;
    }

    let statusMessage,
        messages = [],
        room = this.data.activeRooms[data.room];

    if (utils.user.is_admin(room.admins, room.owner, this.data.current_user) && data.is_present_in_room) {
      notificationType = "join";
    }

    if (notificationType === "leave") {
      if (data.status === 'hc-not-allowed') {
        statusMessage = ChatPanelStrings.user_leave_reason(user.name, ChatPanelStrings.not_allowed);
      } else {
        statusMessage = ChatPanelStrings.user_leave(user.name);
      }
    } else if (notificationType === "join") {
      statusMessage = ChatPanelStrings.user_join(user.name);
    } else if (notificationType === "remove") {
      statusMessage = ChatPanelStrings.user_removed(user.name);
    } else if (notificationType === "add") {
      statusMessage = ChatPanelStrings.user_added(user.name);
    }

    messages.push({
      body: statusMessage,
      type: 'room-presence',
      from: data.room,
      delay: true,
      sender: ' ',
      user_jid
    });

    this.handleIncomingMessages(messages, this);
  }

  addRoomAdmin(roomJid, userId) {
    this.data.activeRooms[roomJid].admins.push(userId);
  }

  updatePresence(pres) {
    notifier.update({ current_user_presence: pres.show });
    this.data.roster[this.data.current_user.user_jid].presence = pres;
    this.set({
      roster: this.data.roster
    });
  }

  resetRoomParticipantsListInitializedFlag() {
    _.forOwn(this.data.activeRooms, (room) => {
      room.participants_fully_initialized = false;
    });
  }

  fetchRoomParticipantsFromAPI(room, includeOffline) {
    AppActions.fetchRoomParticipants(room, includeOffline);
  }

  handleRoomParticipantsFromAPI(data) {
    let room = _.find(this.data.activeRooms, (activeRoom) => activeRoom.id.toString() === data.roomId.toString());

    if (room) {
      let participants = utils.toArray(data.participants);

      this.setRoomParticipantsFullyInitialized(room);

      participants.forEach((participant) => {
        participant.jid = participant.xmpp_jid;
        participant.presence = {
          show: 'chat',
          status: ''
        };
        this.addRoomParticipantFromAPI(room, participant);
      });

      this.updateMessagesIfGuestsConnected(room.jid);
    }
  }

  setRoomParticipantsFullyInitialized(room) {
    room.participants_fully_initialized = true;
  }

  setActiveRooms() {
    this.set('activeRooms', this.data.activeRooms);
    this._updateTotalUnreadCount();
  }

  setActiveGuestUserRegex() {
    var guestRegexUser;
    if (this.data.activeRooms[this.data.active_chat]) {
      guestRegexUser = this.data.activeRooms[this.data.active_chat].guest_mention_regex;
    }
    this.set({
      guestRegexUser: guestRegexUser
    });
  }

  updatePresenceProcessor() {
    this.presenceProcessor.update({
      is_guest: this.data.current_user.is_guest,
      current_user_jid: this.data.current_user.user_jid
    });
  }

  handleArchiveRoom(data, archive, cb) {
    var room = this.data.activeRooms[data.jid];
    AppDispatcher.dispatch('API:update-room',
      {
        params: {
          name: room.name,
          privacy: room.privacy,
          is_archived: archive,
          is_guest_accessible: !!room.guest_url,
          topic: room.topic,
          owner: {
            id: room.owner
          },
          id: room.id
        },
        path: {
          'identifier': room.id,
          'type': 'room'
        },
        jid: data.jid
      }, cb);
  }

  handleArchivedRoom(data, archived){
    var chatInAllRooms = this.data.allRooms[data.jid] || {};
    var chatInActiveRooms = this.data.activeRooms[data.jid] || {};

    chatInAllRooms.is_archived = archived;
    chatInActiveRooms.is_archived = archived;

    this.set({
      allRooms: this.data.allRooms,
      activeRooms: this.data.activeRooms
    });
  }

  handleTopicUpdated(topic, jid) {
    if (jid) {
      if (this.data.allRooms[jid]) {
        this.data.allRooms[jid].topic = topic;
      }
      if (this.data.activeRooms[jid]) {
        this.data.activeRooms[jid].topic = topic;
      }
      this.set({
        allRooms: this.data.allRooms,
        activeRooms: this.data.activeRooms
      });
    }
  }

  openChatByMentionName(mentionName){
    var user = _.find(this.data.roster, function(u){
      return u.mention_name.toLowerCase() === mentionName.toLowerCase();
    });

    let currentUser = this.get('current_user');
    if (user && !currentUser.is_guest) {
      var data = {
        jid: user.jid,
        name: user.name
      };
      AppDispatcher.dispatch('set-route', data);
    }
  }

  /**
   * Generates a roster from the room participants that a guest has requested via coral
   */
  handleGuestRoomParticipants(users) {
    let fake_roster = _.forEach(utils.toArray(users), (user) => {
      user.jid = user.user_jid || utils.jid.build_group_jid(user.id, this.data.group_id, this.data.chat_server);
      user.presence = {
        show: 'chat',
        status: ''
      };
    });
    this.set('roster', _.merge(this.data.roster, _.keyBy(fake_roster, 'jid')));
    this.updateMentionNames();
    this.updateRosterNames();
  }

  updateFeatureFlags(data) {
    if (_.isObject(data) && _.has(data, "feature_flags")) {
      let config = _.merge(this.data.config, data);
      this.set("config", config);
    }
  }

  /**
   * Enables a feature flag
   *
   * @param {Object} feature the feature to enable_guest_classes
   * @param {String} feature.name the name of the feature to enable
   */
  handleEnableDarkFeature(feature) {
    let featureFlags = _.get(this.data.config, "feature_flags", {});
    if (featureFlags && feature.name) {
      featureFlags[feature.name] = true;
      this.updateFeatureFlags({
        feature_flags: featureFlags
      });
    }
  }

  configure(data) {
    this.messageProcessor.configure(data.asset_base_uri);
    if (data.config.auth_method !== 'nonce') {
      this.iqProcessor.addRequiredStartupStanza();
    }
    this.set(data);
  }
}

export default new AppStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/application_store.js
 **/