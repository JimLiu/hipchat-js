import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import AppStore from "./application_store";
import ClientPrefKeys from "keys/client_preferences_keys";
import PreferencesActions from 'actions/preferences_actions';
import Store from 'lib/core/store';
import { chatSearch } from 'helpers/chat_search';
import utils from 'helpers/utils';

class QuickSwitcherStore extends Store {

  constructor() {
    super();

    this.local = this.getLocalDefaults();
  }

  getDefaults() {
    return {
      text: '',
      list: [],
      filtered: false,
      filtered_time: null,
      selected_item: 0
    };
  }

  getLocalDefaults() {
    return {
      enabled: false,
      all: [],
      active: {},
      rooms: [],
      roster: []
    };
  }

  registerListeners() {
    AppDispatcher.register({
      'qs-input-value': (data) => {
        this.handleInputValueChange(data.text);
      },
      'qs-item-hover': (data) => {
        this.set({
          selected_item: data.index
        });
      },
      'qs-select-item': () => {
        this.selectItem();
      },
      'qs-select-prev': () => {
        this.selectPrev();
      },
      'qs-select-next': () => {
        this.selectNext();
      },
      'qs-filter': () => {
        this.filterList(true);
      },
      'qs-reset': () => {
        this.resetQuickSwitcher();
      },
      'qs-hide-hint': () => {
        this.hideHint();
      },
      'before:show-modal-dialog': (data) => {
        this.enableQuickSwitcher(data);
      },
      'before:hide-modal-dialog': () => {
        this.disableQuickSwitcher();
      },
      'updated:roster': () => {
        if (this.local.enabled) {
          this.setupLocalData();
          this.filterList();
        }
      }
    });
  }

  enableQuickSwitcher(data) {
    if (!this.local.enabled && _.get(data, "dialog_type") === "quick-switcher-dialog") {
      this.local.enabled = true;
      this.setupLocalData();
    }
  }

  disableQuickSwitcher() {
    if (this.local.enabled) {
      this.clearLocalData();
    }
  }

  setupLocalData() {
    this.updateRooms(AppStore.get("allRooms"));
    this.updateActive(AppStore.get("activeRooms"));
    this.updateRoster(AppStore.get("roster"));
  }

  clearLocalData() {
    this.local = this.getLocalDefaults();
  }

  filterList(forceUpdate = false) {
    var query = this.data.text;

    if (query) {
      let priorities = _.keysIn(this.local.active),
          sorted_list = chatSearch(this.local.all, query, priorities);

      if (forceUpdate || this.data.selected_item > sorted_list.length - 1){
        this.data.selected_item = 0;
      }

      this.set({
        list: sorted_list,
        filtered_time: new Date().getTime(),
        selected_item: this.data.selected_item,
        filtered: true
      });

    } else {
      this.set({
        list: [],
        selected_item: 0,
        filtered_time: null,
        filtered: false
      });
    }
  }

  handleInputValueChange(text) {
    this.set({
      text: text,
      filtered: false
    });
  }

  updateAll() {
    this.local.all = _.map(this.local.all, (chat) => {
      if (this.local.active[chat.jid]){
        _.assign(chat, this.local.active[chat.jid]);
      } else {
        // for not active rooms
        _.assign(chat, {
            unreadCount: 0,
            unreadMentionCount: 0,
            hasMention: false
        });
      }
      return chat;
    });
  }

  updateActive(updated_rooms) {
    this.local.active = _.mapValues(updated_rooms, (room) => {
      return _.pick(room, 'unreadCount', 'unreadMentionCount', 'hasMention');
    });
    this.updateAll();
  }

  updateRooms(updated_rooms) {
    var rooms = [];
    _.forOwn(updated_rooms, function(room) {
      rooms.push({
        item_type: 'room',
        name: room.name,
        jid: room.jid,
        privacy: room.privacy
      });
    });
    this.local.rooms = rooms;
    this.updateAndConcatAll();
  }

  removeGuests(roster) {
    return _.reject(roster, utils.user.is_guest);
  }

  mapUserData(user) {
    return {
      item_type: 'user',
      id: user.id,
      name: user.display_name || user.name,
      mention_name: user.mention_name,
      jid: user.jid,
      photo_url: user.photo_url,
      presence_show: user.presence.show,
      presence_mobile: user.presence.mobile
    };
  }

  updateRoster(updated_roster) {
    // The roster comes in as an object. Mapping the values of it to an array.
    var roster = _.values(updated_roster);

    this.local.roster = this.removeGuests(roster).map(this.mapUserData);
    this.updateAndConcatAll();
  }

  updateAndConcatAll() {
    this.local.all = [].concat(this.local.roster, this.local.rooms);
    this.updateAll();
  }

  selectItem() {
    var item = this.data.list[this.data.selected_item];

    if (!item){ return; }

    AppDispatcher.dispatch('set-route', {
      jid: item.jid
    });
    AnalyticsDispatcher.dispatch('analytics-open-room', {
      jid: item.jid,
      source: 'switcher'
    });
  }

  selectNext() {
    var selected_item;
    if (this.data.selected_item !== (this.data.list.length - 1)) {
      selected_item = this.data.selected_item + 1;
    }
    this.set('selected_item', selected_item);
  }

  selectPrev() {
    var selected_item;
    if (this.data.selected_item !== 0) {
      selected_item = this.data.selected_item - 1;
    }
    this.set('selected_item', selected_item);
  }

  resetQuickSwitcher() {
    this.set({
      text: '',
      list: [],
      selected_item: 0,
      filtered: false
    });
  }

  hideHint() {
    PreferencesActions.savePreferences({
      [ClientPrefKeys.SHOW_QUICK_SWITCHER_HINT]: false
    });
  }
}

export default new QuickSwitcherStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/quick_switcher_store.js
 **/