import AppDispatcher from 'dispatchers/app_dispatcher';
import AppConfig from 'config/app_config';
import FlagActions from 'actions/flag_actions';
import PreferencesStore from './preferences_store';
import ChatHeaderStrings from 'strings/chat_header_strings';
import PermissionsStore from './permissions_store';
import IntegrationHelper from 'helpers/integration_helper';
import Store from 'lib/core/store';
import utils from 'helpers/utils';
import moment from 'moment';
import spi from 'spi';

class ChatHeaderStore extends Store {

  constructor() {

    super();

    this.default_profile = {
      email: '',
      mention_name: '',
      name: '',
      photo_large: '',
      photo_small: '',
      timezone: false,
      title: ''
    };

    this.local = {
      profiles: {}
    };
  }

  getDefaults() {
    return {
      initialized: false,
      active_chat: null,
      path_prefix: '',
      type: '',
      rooms: {},
      topic_editing: false,
      chat: {
        jid: '',
        name: '',
        topic: null,
        photo_large: '',
        title: '',
        status: '',
        privacy: '',
        is_archived: '0',
        email: '',
        presence: {},
        time: '',
        loading_profile: true
      },
      video_enabled: false,
      user_is_admin: false,
      current_user: {},
      per_room_notifications_enabled: false
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
      },
      'updated:emoticons': ({ path_prefix }) => {
        this.set({ path_prefix });
      },
      'updated:config': (config) => {
        this.handleConfig(config);
      },
      'updated:current_user': (user) => {
        this.local.profiles[user.user_jid] = _.assign({
          name: user.user_name,
          mention_name: user.mention
        }, user);
        this.set({
          current_user: user
        });
      },
      'updated:activeRooms': (rooms) => {
        this.handleRoomsUpdate(rooms);
        spi.onRoomActionsChanged(this.getCurrentRoomActions());
      },
      'updated:profiles': (profiles) => {
        this.handleProfilesUpdate(profiles);
      },
      'updated:roster': (roster) => {
        this.handleRosterUpdate(roster);
      },
      'updated:active_chat': (jid) => {
        this.data.active_chat = jid;
        this.updateRoomHeaderState(jid);
      },
      'after:updated:active_chat': () => {
        spi.onRoomActionsChanged(this.getCurrentRoomActions());
      },
      'before:set-route': (data) => {
        if (data.jid !== this.data.active_chat) {
          this.resetChat(data.jid);
        }
      },
      'edit-topic': () => {
        this.set('topic_editing', true);
      },
      'dismiss-topic-edit': () => {
        this.set({
          'topic_editing': false
        });
      },
      'set-topic': (topic) => {
        this.handleSetTopic(topic);
      },
      'updated:preferences': () => {
        const jid = this.data.active_chat;
        if (utils.jid.is_private_chat(jid) && this.data.rooms[jid]) {
          this._updateChatTime(this.data.rooms[jid]);
          this.set('chat', this.data.chat);
        }
      }
    });
  }

  handleRoomsUpdate(updatedRooms) {
    var currentRooms = this.data.rooms,
        activeChat = this.data.active_chat,
        deleted = _.difference(_.keys(currentRooms), _.keys(updatedRooms));

    if (deleted.length) {
      currentRooms = _.omit(currentRooms, deleted);
    }

    let update = {
          rooms: _.merge(currentRooms, updatedRooms)
        };

    if (updatedRooms[activeChat]) {
      update.chat = _.merge(this.data.chat, updatedRooms[activeChat]);
    }

    this.set(update);
    this.updateRoomHeaderState(activeChat);
  }

  handleProfilesUpdate(profiles) {
    _.map(profiles, (profile, jid) => {
      this.local.profiles[jid] = profile;
      if (this.data.rooms[jid]) {
        this.data.rooms[jid] = _.merge(this.data.rooms[jid], profile);
      }
    });
    this.updateRoomHeaderState(this.data.active_chat);
  }

  updateProfile(jid, profile) {
    const keys = _.keys(this.default_profile );
    _.forEach(keys, (key) => {
      if (profile[key]) {
        this.local.profiles[jid][key] = profile[key];
      }
    });
  }

  handleRosterUpdate(roster) {
    let rooms = _.cloneDeep(this.data.rooms);
    let profiles = this.local.profiles;
    const updateProfile = this.updateProfile.bind(this);

    _.forEach(rooms, (room, jid) => {
      if (room && roster[jid]) {
        let presence = roster[jid].presence;

        room.presence = { ...presence };
        room.name = roster[jid].name;
        if (profiles[jid]) {
          updateProfile(jid, room);
        }
      }
    });

    this.handleRoomsUpdate(rooms);
  }

  resetChat(jid) {
    var chat = _.assign({}, this.data.chat, this.data.rooms[jid]);
    chat.loading_profile = true;
    this.set("chat", chat);
  }

  updateRoomHeaderState(jid) {
    clearTimeout(this.timeout);

    if (!jid || utils.jid.is_lobby(jid) || !this.data.rooms[jid]) {
      return;
    }

    let updatedChat = this.data.rooms[jid];
    let currentChat = this.data.chat;
    let updatedChatType = this.data.rooms[jid].type;
    let currentChatType = this.data.type;
    let localProfile = this.local.profiles[jid];
    let defaultPanel = {
      chat: 'files',
      groupchat: 'roster'
    };

    if (currentChatType !== updatedChatType) {
      this.data.active_panel = defaultPanel[updatedChatType];
    }
    if (updatedChatType === 'chat' && updatedChat) {
      if (localProfile) {
        updatedChat.loading_profile = false;
      }
      _.merge(updatedChat, _.clone(this.default_profile), localProfile);
      this._updateChatTime(updatedChat);
      this.timeout = setTimeout( () => {
        this.updateRoomHeaderState(jid);
      }, 60000);
    }

    var chat = _.assign({}, currentChat, updatedChat);
    this.set({
      active_chat: jid,
      type: chat.type,
      chat: chat,
      active_panel: this.data.active_panel
    });
  }

  _updateChatTime(chat){
    const format = PreferencesStore.shouldUse24HrTime() ? 'ddd HH:mm' : 'ddd h:mm A';
    if (chat.timezone) {
      var timezone_offset = parseFloat(chat.timezone.utc_offset);
      this.data.chat.time = moment().utcOffset(timezone_offset).format(format);
    } else {
      this.data.chat.time = moment().format(format);
    }
  }

  getCurrentRoomActions() {
    let chat = this.data.chat,
      activeJid = this.data.active_chat,
      isLobby = activeJid === 'lobby',
      isSearch = activeJid === 'search',
      isRoom = this.data.type === 'groupchat' && !isLobby && !isSearch,
      isAdmin = PermissionsStore.get('user_is_room_admin'),
      isPublic = chat.privacy === 'public',
      isArchived = utils.room.is_archived(chat);

    if (isRoom) {
      return {
        room_notifications: !!this.data.per_room_notifications_enabled,
        integrations: PermissionsStore.canManageRoomIntegrations() && !isArchived,
        create_new_room: PermissionsStore.canCreateRoom(),
        invite_users: (isPublic || !isPublic && isAdmin) && !isArchived,
        remove_users: !isPublic && isAdmin && !isArchived,
        enable_guest_access: PermissionsStore.canToggleGuestAccess() && !chat.guest_url,
        disable_guest_access: PermissionsStore.canToggleGuestAccess() && !!chat.guest_url,
        archive_room: isAdmin && !isArchived,
        unarchive_room: isAdmin && isArchived,
        change_topic: !isArchived,
        change_privacy: isAdmin && !isArchived,
        delete_room: isAdmin && !isArchived,
        rename_room: isAdmin && !isArchived
      };
    }

    return {
      room_notifications: false,
      integrations: false,
      create_new_room: PermissionsStore.canCreateRoom(),
      invite_users: false,
      remove_users: false,
      enable_guest_access: false,
      disable_guest_access: false,
      archive_room: false,
      unarchive_room: false,
      change_topic: false,
      change_privacy: false,
      delete_room: false,
      rename_room: false
    };
  }

  handleSetTopic(topic) {
    topic = topic.trim();

    if (topic.length > AppConfig.max_topic_text_length) {
      FlagActions.showFlag({
        type: "error",
        body: this._flagBody(ChatHeaderStrings.topic_length_error(AppConfig.max_topic_text_length)),
        close: "auto"
      });
      topic = topic.substring(0, AppConfig.max_topic_text_length);
    }

    this.data.chat.topic = topic;

    AppDispatcher.dispatch('send-topic', {
      jid: this.data.chat.jid,
      topic: topic
    });
    this.data.topic_editing = false;
  }

  _flagBody(error_msg) {
    return () => (
      <div>
        <p className="hc-message-body">{error_msg}</p>
      </div>
    );
  }

  handleConfig(config) {
    this.set({
      active_chat: PreferencesStore.get('chatToFocus') || this.data.active_chat,
      video_enabled: _.get(config, "video_chat_enabled") && _.get(config, 'feature_flags.web_client_video_chat'),
      per_room_notifications_enabled: _.get(config, 'feature_flags.web_client_per_room_notifications'),
      web_client_integrations_enabled: IntegrationHelper.isFeatureEnabled(config),

      // Defaulting this feature flag to true because existing deployments of HCS don't include this flag
      web_client_addlive_video_enabled: _.get(config, 'feature_flags.web_client_addlive_video', true),

      web_client_enso_video_enabled: _.get(config, 'feature_flags.web_client_enso_video', false),
      web_client_enso_room_video_enabled: _.get(config, 'feature_flags.web_client_enso_room_video', false)
    });
  }

}

module.exports = new ChatHeaderStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/chat_header_store.js
 **/