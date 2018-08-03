import AppDispatcher from 'dispatchers/app_dispatcher';
import AppStore from 'stores/application_store';
import AppConfig from 'config/app_config';
import Store from 'lib/core/store';
import { chatSearch } from 'helpers/chat_search';
import utils from 'helpers/utils';

class LobbyStore extends Store {

  constructor() {
    super();
    this.local = {
      all: [],
      active: [],
      forceUpdate: false
    };
  }

  getDefaults() {
    return {
      is_active: false,
      filtered: [],
      input_text: '',
      filter: {
        scope: "all",
        query: ""
      },
      user_is_admin: false,
      invite_url: false,
      web_server: AppConfig.default_web_server,
      selected_item: 0,
      dialog_visible: false,
      filtered_time: false,
      theme: 'light'
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
      'updated:roster': () => {
        this.populateAll();
      },
      'updated:active_chat': (jid) => {
        this.handleNewActiveChat(jid);
      },
      'updated:allRooms': () => {
        this.handleAllRoomsUpdate();
      },
      'updated:activeRooms': (rooms) => {
        this.handleActiveRoomsUpdate(rooms);
      },
      'updated:preferences': (prefs) => {
        if (prefs.theme !== this.data.theme) {
          this.set('theme', prefs.theme);
        }
      },
      'room-deleted': (room) => {
        this.handleRoomDeleted(room.jid);
      },
      'filter-lobby': (filter) => {
        this.handleFilter(true, filter);
      },
      'set-lobby-filter-text': (data) => {
        this.set('input_text', data.text);
      },
      'updated:web_server': (web_server) => {
        this.set("web_server", web_server);
      },
      'lobby-reset-selected-item': () => {
        this.set('selected_item', 0);
      },
      'lobby-item-hover': (data) => {
        this.set({
          selected_item: data.index
        });
      },
      'lobby-select-next-item': () => {
        this._selectNextItem();
      },
      'lobby-select-prev-item': () => {
        this._selectPrevItem();
      },
      'show-modal-dialog': () => {
        this.set('dialog_visible', true);
      },
      'hide-modal-dialog': () => {
        this.set('dialog_visible', false);
      }
    });
  }

  handleConfig(config) {
    this.set({
      user_is_admin: _.get(config, "is_admin", false),
      invite_url: _.get(config, "invite_url", false)
    });
  }

  handleNewActiveChat(jid) {
    this.data.is_active = utils.jid.is_lobby(jid);
    if (this.data.is_active) {
      this.populateAll();
      this.handleFilter();
    } else {
      this.clearAll();
    }
  }

  handleAllRoomsUpdate() {
    if (this.data.is_active) {
      this.populateAll();
      this.handleFilter();
    }
  }

  handleActiveRoomsUpdate(rooms) {
    let updated = _.keys(rooms);
    let forceUpdate = !_.isEqual(this.local.active, updated);
    this.local.active = updated;
    if (this.data.is_active) {
      this.handleFilter(forceUpdate);
    }
  }

  clearAll() {
    this.local.all = [];
  }

  populateAll() {

    if (!this.data.is_active) {
      return;
    }

    let roster = this.removeGuests(AppStore.get("roster")),
        rooms = _.toArray(AppStore.get("allRooms")),
        all = rooms.concat(roster),
        updated = this.removeArchivedAndEmpty(all);

    this.local.forceUpdate = !_.isEqual(this.local.all, updated);
    this.local.all = updated;
  }

  handleFilter(update = false, filter = {}) {
    var chats_have_changed = update || this.local.forceUpdate,
        chats = (!chats_have_changed && this.data.filtered) ? this.data.filtered : this.local.all,
        scope = filter.scope || this.data.filter.scope,
        is_scoped = scope === 'rooms' || scope === 'people',
        query = _.isString(filter.query) ? filter.query : this.data.filter.query;

    if (is_scoped && (chats_have_changed || filter.scope)) {
      chats = _.filter(chats, function (item) {
        if (scope === 'rooms') {
          return utils.jid.is_room(item.jid);
        }
        if (scope === 'people') {
          return utils.jid.is_private_chat(item.jid);
        }
        return false;
      });
    }

    if (chats_have_changed || _.isString(filter.query)) {
      chats = chatSearch(chats, query, this.local.active);
    }

    this.local.forceUpdate = false;

    this.set({
      filtered: chats,
      filter: {
        scope: scope || 'all',
        query: query || ''
      },
      selected_item: chats_have_changed ? 0 : this.data.selected_item,
      filtered_time: (new Date).getTime()
    });
  }

  removeGuests(roster) {
    return _.reject(roster, utils.user.is_guest);
  }

  removeArchivedAndEmpty(items){
    return _.reject(items, (item) => {
      return !item || item.name === '' || utils.room.is_archived(item);
    });
  }

  handleRoomDeleted(jid) {
    if (this.data.is_active) {
      this.local.all = _.reject(this.data.all, {jid: jid});
      this.local.forceUpdate = true;
      this.handleFilter();
    }
  }

  _selectNextItem(){
    this.set('selected_item', this.data.selected_item + 1);
  }

  _selectPrevItem(){
    this.set('selected_item', this.data.selected_item - 1);
  }

}

module.exports = new LobbyStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/lobby_store.js
 **/