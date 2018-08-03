import AppDispatcher from 'dispatchers/app_dispatcher';
import PreferencesStore from './preferences_store';
import PreferencesActions from 'actions/preferences_actions';
import LayoutActions from 'actions/layout_actions';
import ClientPrefKeys from 'keys/client_preferences_keys';
import Store from 'lib/core/store';
import RoomSize from 'lib/enum/room_size';
import utils from 'helpers/utils';
import IntegrationHelper from 'helpers/integration_helper';
import app_config from 'config/app_config';

class RosterStore extends Store {

  getDefaults() {
    return {
      admins: [],
      current_user: {},
      users: {},
      rooms: {},
      files: [],
      links: [],
      loading: false,
      participants: {
        members: [],
        guests: []
      },
      initialized: false,
      size: RoomSize.MEDIUM,
      active_chat: null,
      active_chat_privacy: null,
      guest_url: '',
      chat_type: '',
      invite_url: false,
      user_is_admin: false,
      active_integration: null,
      active_integration_data_template_values: null,
      can_share_files: true,
      panels_scroll_top: {}
    };
  }

  registerListeners() {
    AppDispatcher.registerOnce({
      'hc-init': (data) => {
        this.handleConfig(data);
      }
    });

    AppDispatcher.register({
      'updated:config': (config) => {
        this.handleConfig(config);
      },
      'updated:current_user': (user) => {
        this.data.current_user = user;
      },
      'updated:roster': (roster) => {
        this.handleRosterUpdate(roster);
      },
      'updated:permissions': (perms) => {
        this.set({
          can_share_files: perms.file_sharing === 'all'
        });
      },
      'app-state-ready': () => {
        this.data.initialized = true;
        this.fetchPanelContent(this.data.active_chat);
      },
      'app-state-reconnected': () => {
        AppDispatcher.dispatch('fetch-recent-files');
        AppDispatcher.dispatch('fetch-recent-links');
      },
      'fetch-files-history': () => {
        let room = this.data.active_chat;
        if (utils.jid.is_chat(room)) {
          let lastFile = _.last(this.data.files);
          let before = lastFile ? lastFile.date : utils.format_time_for_history(new Date());

          AppDispatcher.dispatch('fetch-files', { room, before });
        }
      },
      'fetch-links-history': () => {
        let room = this.data.active_chat;
        if (utils.jid.is_chat(room)) {
          let lastLink = _.last(this.data.links);
          let before = lastLink ? lastLink.date : utils.format_time_for_history(new Date());

          AppDispatcher.dispatch('fetch-links', { room, before });
        }
      },
      'fetch-recent-files': () => {
        let room = this.data.active_chat;
        if (utils.jid.is_chat(room)) {
          let firstFile = _.first(this.data.files);
          let after = firstFile ? firstFile.date : null;

          AppDispatcher.dispatch('fetch-files', { room, after });
        }
      },
      'fetch-recent-links': () => {
        let room = this.data.active_chat;
        if (utils.jid.is_chat(room)) {
          let firstLink = _.first(this.data.links);
          let after = firstLink ? firstLink.date : null;

          AppDispatcher.dispatch('fetch-links', { room, after });
        }
      },
      'DAL:handle-created-room': (room) => {
        this.handleNewRoom(room);
      },
      'mark-participant-unknown': (data) => {
        this.markParticipantForPrivateRoom(data);
      },
      'unmark-participant': (data) => {
        this.unmarkParticipantForPrivateRoom(data);
      },
      'updated:active_chat': (jid) => {
        this.handleSelectRoom(jid);
        this.fetchPanelContent(jid);
      },
      'updated:activeRooms': (rooms) => {
        this.handleActiveRoomsUpdate(rooms);
      },
      'select-panel': (data) => {
        this.selectPanel(data);
      },
      'fetch-panel-content-for-internal-glances': (data) => {
        if (data.activeIntegration) {
          this.fetchPanelContent(this.data.active_chat);
        }
      },
      'toggle-right-sidebar': () => {
        this.toggleSidebar(this.data.chat_type);
      },
      'set-right-sidebar-panel-scrolltop': ({ room, type, scroll_top }) => {
        if (utils.jid.is_chat(room)){
          if (!this.data.panels_scroll_top[room]){
            this.data.panels_scroll_top[room] = {};
          }
          this.data.panels_scroll_top[room][type] = scroll_top;
          this.set('panels_scroll_top', this.data.panels_scroll_top);
        }
      }
    });
  }

  updateLoadingSpinner(){

    if (!utils.jid.is_chat(this.data.active_chat)){
      return;
    }

    let chat = this.data.rooms[this.data.active_chat];

    if (!chat) {
      return;
    }

    if (chat.files_fetching && !chat.files_fetched) {
      this.showLoadingSpinnerOnPanel("files");
    } else {
      this.hideLoadingSpinnerOnPanel("files");
    }
    if (chat.links_fetching && !chat.links_fetched) {
      this.showLoadingSpinnerOnPanel("links");
    } else {
      this.hideLoadingSpinnerOnPanel("links");
    }
  }

  showLoadingSpinnerOnPanel(type){
    if (this.getActivePanel(this.data.chat_type) === type) {
        this.set('loading', true);
    }
  }

  hideLoadingSpinnerOnPanel(type){
    if (this.getActivePanel(this.data.chat_type) === type) {
      this.set('loading', false);
    }
  }

  handleConfig(config) {
    this.data.active_chat = this.data.active_chat || PreferencesStore.getChatToFocus();
    this.set({
      user_is_admin: config.is_admin,
      invite_url: config.invite_url,
      web_client_integrations_enabled: IntegrationHelper.isFeatureEnabled(config)
    });
    this.fetchPanelContent(this.data.active_chat);
  }

  selectPanel(data) {
    if (this.shouldToggleSidebar(data.activePanel)) {
      this.toggleSidebar(this.data.chat_type);
    }
    this.setPanel(data.activePanel);
    this.fetchPanelContent(this.data.active_chat);
  }

  setPanel(panel) {
    if (this.data.chat_type === "chat") {
      PreferencesActions.savePreferences({ [ClientPrefKeys.CHAT_ACTIVE_PANEL]: panel });
    } else if (this.data.chat_type === "groupchat") {
      PreferencesActions.savePreferences({ [ClientPrefKeys.GROUPCHAT_ACTIVE_PANEL]: panel });
    }
  }

  shouldToggleSidebar(panel) {
    var result = false;
    if (this.data.chat_type === "chat") {
      result = (panel === PreferencesStore.getChatActivePanel() || !PreferencesStore.shouldShowChatSidebar());
    } else if (this.data.chat_type === "groupchat") {
      result = (panel === PreferencesStore.getGroupChatActivePanel() || !PreferencesStore.shouldShowGroupChatSidebar());
    }
    return result;
  }

  toggleSidebar(chat_type) {
    var visibility;
    if (chat_type === "chat") {
      visibility = !PreferencesStore.shouldShowChatSidebar();
      LayoutActions.setRightChatSidebarVisibility(visibility);
    } else if (chat_type === "groupchat") {
      visibility = !PreferencesStore.shouldShowGroupChatSidebar();
      LayoutActions.setRightGroupChatSidebarVisibility(visibility);
    }
  }

  sidebarShowing(jid) {
    return ((utils.room.detect_chat_type(jid) === "chat" && PreferencesStore.shouldShowChatSidebar()) || (utils.room.detect_chat_type(jid) === "groupchat" && PreferencesStore.shouldShowGroupChatSidebar()));
  }

  getActivePanel(chat_type) {
    if (!this.data.web_client_integrations_enabled) {
      if (chat_type === "chat") {
        return PreferencesStore.getChatActivePanel();
      } else if (chat_type === "groupchat") {
        return PreferencesStore.getGroupChatActivePanel();
      }
    } else {
      let key = null;

      if (chat_type === "chat") {
        key = _.get(PreferencesStore.getActiveChatIntegration(), 'key');
      } else if (chat_type === "groupchat") {
        key = _.get(PreferencesStore.getActiveGroupchatIntegration(), 'key');
      }

      if (IntegrationHelper.isInternalIntegrationKey(key)) {
        return IntegrationHelper.split_full_key(key)[1];
      }
    }
  }

  fetchPanelContent(jid) {
    // Only fetch if sidebar is visible
    if (this.data.initialized && utils.jid.is_chat(jid) && this.sidebarShowing(jid) && !this.data.current_user.is_guest) {
      let activePanel = this.getActivePanel(this.data.chat_type);

      if (activePanel === 'files' || activePanel === 'links') {
        if (this._shouldFetchPanelContent(jid, activePanel)) {
          AppDispatcher.dispatch(`fetch-${activePanel}`, {room: jid});
        }
      }
    }
  }

  _shouldFetchPanelContent(jid, panel) {
    let room = this.data.rooms[jid];

    let fetching = _.get(room, `${panel}_fetching`, false);
    let fetched = _.get(room, `${panel}_fetched`, false);

    return !(fetching || fetched);
  }

  isSignedFile(url) {
    return this.isFileUrlAuthenticated(url) || this.getPublicUrlFromThumbnail(url);
  }

  isFileUrlAuthenticated(url) {
    let file = _.find(this.data.files, { url });
    return _.get(file, 'is_authenticated', false);
  }

  getPublicUrlFromThumbnail(url) {
    let publicUrl = null;
    let jid = this.data.active_chat;

    AppDispatcher.dispatch('get-public-url-from-thumbnail', url, jid, (fileUrl) => publicUrl = fileUrl);
    return publicUrl;
  }

  markParticipantForPrivateRoom(data) {
    let user = this.data.users[data.user];

    if (user) {
      if (user['not_present_in']) {
        user['not_present_in'].push(data.room);
      } else {
        user['not_present_in'] = [data.room];
      }
    }
  }

  unmarkParticipantForPrivateRoom(data) {
    let user = this.data.users[data.user];
    if (_.includes(_.get(user, 'not_present_in'), data.room)) {
      user['not_present_in'] = _.without(user['not_present_in'], data.room);
    }
  }

  sortRoster(roster) {
    return _.sortBy(roster, 'name');
  }

  static compareStatus(x, y) {
    if (x === y) {
      return 0;
    }
    var x_rank = RosterStore.status_sorting_order[x] || 7;
    var y_rank = RosterStore.status_sorting_order[y] || 7;
    return x_rank > y_rank ? 1 : -1;
  }

  static compareName(x, y) {
    if (x === y) {
      return 0;
    }
    return x.name.toLowerCase() > y.name.toLowerCase() ? 1 : -1;
  }

  static comparePeople(x, y) {
    if (x === y) {
      return 0;
    }
    if (!x.presence || !y.presence) {
      return (!y.presence) ? 1 : (!x.presence) ? -1 : 0;
    }

    var status_comparison = RosterStore.compareStatus(x.presence.show, y.presence.show);
    if (status_comparison !== 0) {
      return status_comparison;
    }
    return RosterStore.compareName(x, y);
  }

  sortRosterByPresenceAndName(roster) {
    return roster.sort(RosterStore.comparePeople);
  }

  sortRosterByName(roster) {
    return roster.sort(RosterStore.compareName);
  }

  getSortedRosterByPresenceAndName(roles) {
    var all_people = [].concat.apply([], _.map(roles, (role) => this.get('participants')[role]));
    return this.sortRosterByPresenceAndName(all_people);
  }

  getSortedRoster(roles) {
    var all_people = [].concat.apply([], _.map(roles, (role) => this.get('participants')[role])),
        size = this.getRoomSize();

    if (size === RoomSize.XLARGE) {
      return [];
    } else if (size === RoomSize.LARGE) {
      return this.sortRosterByName(all_people);
    }
    return this.sortRosterByPresenceAndName(all_people);
  }

  insertAlphaHeadings(users = []) {
    let roster = [],
        letter = '';

    _.forEach(users, user => {
      var initial = user.name.substr(0, 1).toUpperCase();
      if (initial !== letter) {
        letter = initial.toUpperCase();
        roster.push({ letter });
      }
      roster.push(user);
    });

    return roster;
  }

  getRoomSize() {
    var count = this.getRosterCount(['members', 'guests']).total,
        breakpoints = app_config.roster_panel.breakpoints;

    if (count < breakpoints.small) {
      return RoomSize.SMALL;
    } else if (count < breakpoints.medium) {
      return RoomSize.MEDIUM;
    } else if (count < breakpoints.large) {
      return RoomSize.LARGE;
    }
    return RoomSize.XLARGE;
  }

  getRoster() {
    let size = this.getRoomSize(),
        roster = [];

    if (size === RoomSize.XLARGE) {
      return roster;
    }

    let members = this.getSortedRoster(['members']),
        guests = this.getSortedRoster(['guests']),
        hasMembers = members.length > 0,
        hasGuests = guests.length > 0;

    if (hasMembers) {
      if (size === RoomSize.LARGE) {
        members = this.insertAlphaHeadings(members);
      }
      roster = roster.concat(members);
    }

    if (hasGuests) {
      roster.push({ group_title: 'guests' });
      roster = roster.concat(guests);
    }

    return roster;
  }

  countRoster(roster) {
    var total_members = 0,
        online_members = 0,
        room = this.data.rooms[this.data.active_chat];

    if (_.get(room, 'roster_size') && !room.participants_fully_initialized) {
      total_members = room.roster_size;
      online_members = 0;
    } else {
      _.each(roster, user => {
        total_members++;
        if (user.presence && user.presence.show === "chat") {
          online_members++;
        }
      });
    }

    return {
      online: online_members,
      total: total_members
    };
  }

  getRosterCount(roles) {
    var all_people = [].concat.apply([], _.map(roles, (role) => this.get('participants')[role]));
    return this.countRoster(all_people);
  }

  handleActiveRoomsUpdate(rooms) {
    var deleted = _.difference(_.keys(this.data.rooms), _.keys(rooms));
    if (deleted.length) {
      this.data.rooms = _.omit(this.data.rooms, deleted);
    } else {
      this.data.rooms = _.merge(this.data.rooms, rooms);
    }
    if (this.data.active_chat && utils.jid.is_chat(this.data.active_chat)) {
      this.data.rooms[this.data.active_chat] = rooms[this.data.active_chat];
      this.handleSelectRoom(this.data.active_chat);
    }
  }

  handleRosterUpdate(roster) {
    _.map(this.data.participants, (group, role) => {
      if (this.data.participants[role].length) {
        this.sortRoster(this.data.participants[role]);
      }
    });
    this.data.users = roster;
    this.handleSelectRoom(this.data.active_chat);
  }

  handleNewRoom(room) {
    this.set({
      active_chat: room.jid,
      chat_type: utils.room.detect_chat_type(room.jid)
    });
  }

  handleSelectRoom(jid) {
    if (!jid || !utils.jid.is_chat(jid)) {
      return;
    }

    var type = utils.room.detect_chat_type(jid),
        room_privacy,
        files = [],
        links = [],
        admins,
        owner,
        guest_url;

    this.data.participants = {
      members: [],
      guests: []
    };

    if (this.data.rooms[jid]) {
      room_privacy = this.data.rooms[jid].privacy;
      guest_url = this.data.rooms[jid].guest_url;
      files = this.data.rooms[jid].files;
      links = this.data.rooms[jid].links;
      admins = this.data.rooms[jid].admins;
      owner = this.data.rooms[jid].owner;
      type = this.data.rooms[jid].type;
      _.map(this.data.rooms[jid].participants, (group, role) => {
        _.each(group, (user_jid) => {
          if (this.data.users[user_jid]) {
            if (this.data.rooms[jid].privacy === 'private'
                && this.data.users[user_jid].not_present_in
                && this.data.users[user_jid].not_present_in.indexOf(jid) !== -1) {
              this.data.participants[role].push(_.assign({}, this.data.users[user_jid], {
                presence: {
                  show: 'unknown',
                  status: '',
                  idleTime: false
                }
              }));
            } else {
              this.data.participants[role].push(_.cloneDeep(this.data.users[user_jid]));
            }
          }
        });
        this.data.participants[role] = this.sortRoster(_.compact(this.data.participants[role]));
      });
    }

    this.set({
      admins: admins,
      owner: owner,
      users: this.data.users,
      participants: this.data.participants,
      active_chat: jid,
      active_chat_privacy: room_privacy,
      chat_type: type,
      size: this.getRoomSize(),
      files: files,
      links: links,
      guest_url: guest_url
    });

    this.updateLoadingSpinner();
  }
}

RosterStore.status_sorting_order = {
  "chat": 1,
  "away": 2,
  "xa": 2,
  "dnd": 3,
  "mobile": 4,
  "unavailable": 5,
  "unknown": 6
};

export default new RosterStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/roster_store.js
 **/