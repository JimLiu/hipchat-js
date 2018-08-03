import AppDispatcher from 'dispatchers/app_dispatcher';
import Store from "lib/core/store";
import utils from 'helpers/utils';
import PreferencesActions from 'actions/preferences_actions';
import PreferencesStore from 'stores/preferences_store';
import NetworkStatusHelper from 'helpers/network_status_helper';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import AvatarHelper from 'helpers/avatar_helper';

class RoomsNavStore extends Store {

  constructor() {
    super();

    this.local = {
      auto_join: [],
      closedChatsIndex: {}
    };

    this.savePrefsDebounced = _.debounce(this.savePrefs, 2000, {leading: false, trailing: true});
  }

  getDefaults() {
    return {
      current_user: {},
      active_chat: PreferencesStore.getChatToFocus(),
      active_chat_type: '',
      rooms: {
        people: [],
        rooms: []
      },
      room_order: [],
      search_nav_item_visible: false,
      group_name: "",
      group_avatar_url: "",
      group_avatar_bg: "",
      feature_flags: {},
      drag_target: false,
      drag_over_target: false,
      drag_over_clientY: false,
      dragging: false,
      ui_available: false
    };
  }

  registerListeners() {
    AppDispatcher.registerOnce({
      'app-state-ready': () => {
        this.hc_init_complete = true;
      },
      'updated:ui_available': (val) => {
        // This is the point where the preloader has been hidden
        this.set("ui_available", val);
      }
    });
    AppDispatcher.register({
      'updated:config': (config) => {
        this.handleConfig(config);
      },
      'updated:current_user': (user) => {
        this.set('current_user', user);
      },
      'updated:roster': (roster) => {
        this.handleRosterUpdate(roster);
      },
      'updated:activeRooms': (rooms) => {
        this.handleRoomsUpdate(rooms);
      },
      'updated:active_chat': (jid) => {
        this.handleSelectRoom(jid);
      },
      'updated:profiles': (profiles) => {
        this.handleProfiles(profiles);
      },
      'room-closed': ({ jid }) => {
        this.handleRoomClosed(jid);
      },
      'search-history': () => {
        this.set('search_nav_item_visible', true);
      },
      'remove-search-nav-item': () => {
        this.set('search_nav_item_visible', false);
      },
      'update-room-order': (room_jids) => {
        this.set({
          drag_target: false
        });
        this.updateRoomOrder(room_jids);
      },
      "restore-room-order": ({ jid }) => {
        let oldIndex = this.local.closedChatsIndex[jid];
        if (oldIndex !== undefined) {
          let roomOrder = _.cloneDeep(this.data.room_order);
          let newIndex = this.data.room_order.indexOf(jid);
          if (oldIndex !== newIndex && oldIndex < this.data.room_order.length){
            roomOrder.splice(newIndex, 1);
            roomOrder.splice(oldIndex, 0, jid);
            this.updateRoomOrder(roomOrder);
          }
          if (NetworkStatusHelper.isOnline()) {
            delete this.local.closedChatsIndex[jid];
          }
        }
      },
      'navigate-rooms': (data) => {
        this.navigateRooms(data);
      },
      'rooms-nav-drag-start': (data) => {
        this.handleDragStart(data.target);
      },
      'rooms-nav-drag-over': (data) => {
        this.handleDragOver(data.event);
      },
      'rooms-nav-drag-end': () => {
        this.handleDragEnd();
      }
    });
  }

  /**
   * Helper method for grouping tabs (rooms first then people)
   * @param {object} tabs
   */
  groupRooms(tabs) {
    tabs = _.groupBy(_.reject(tabs, function (item) {
        return !item || item.name === '';
      }), function (chat) {
      return chat.type === 'groupchat' ? 'rooms' : 'people';
    });
    return tabs;
  }

  /**
   * Helper method for ordering rooms
   * @param {array} rooms
   */
  orderRooms(rooms) {
    if (this.data.room_order.length) {
      var results = _.compact(_.map(this.data.room_order, (jid) => {
        if (rooms[jid]) {
          return rooms[jid];
        }
      }));
      var newRooms = _.map(rooms, function (room) {
        var newRoom = _.find(results, function (item) {
          return room.jid === item.jid;
        });
        if (!newRoom) {
          return room;
        }
      });
      return _.compact(results.concat(newRooms));
    }
    return rooms;
  }

  /**
   * Helper method for setting room_order array based on autoJoin or RoomsNavStore rooms
   * @param {array} autoJoin
   */
  setRoomOrder(autoJoin) {
    var jids;
    if (autoJoin) {
      jids = _.map(autoJoin, (room) => {
        return room.jid;
      });
    } else {
      jids = _.flatten(_.map(['rooms', 'people'], (groupName) => {
        return _.map(this.data.rooms[groupName], (room) => {
          return room.jid;
        });
      }));
    }
    this.set({
      room_order: jids
    });
  }

  handleConfig(config) {
    var group_avatar_url = AvatarHelper.cleanAvatarURL(_.get(config, "group_avatar_url"));
    this.set({
      group_avatar_bg: _.get(config, "group_avatar_bg"),
      group_avatar_url: group_avatar_url,
      group_name: _.get(config, "group_name"),
      feature_flags: _.get(config, "feature_flags")
    });
  }

  handleRosterUpdate(roster) {
    _.map(roster, (user, jid) => {
      let room = _.find(this.data.rooms['people'], (chat) => {
        return chat.jid === jid;
      });
      if (room) {
        _.assign(room.presence, roster[jid].presence);
        if (_.get(user, "name")) {
          room.name = user.name;
        }
      }
    });

    this.set({
      rooms: this.data.rooms
    });
    this.setRoomOrder();
  }

  /**
   * Handle rooms update - accepts activeRooms obj with jids as keys
   * @param {object} activeRooms
   */
  handleRoomsUpdate(activeRooms) {
    let rooms;
    let orderedRooms;

    _.reject(activeRooms, (room) => {return !room;});
    orderedRooms = this.orderRooms(activeRooms);
    rooms = this.groupRooms(orderedRooms);
    _.assign(this.data, {
      rooms: _.defaults(rooms, {rooms: [], people: []}),
      active_chat: this.data.active_chat
    });
    if (this.hc_init_complete && !activeRooms[this.data.active_chat] && !utils.jid.is_search(this.data.active_chat)) {
      this.data.active_chat = 'lobby';
    }
    this.saveRooms(orderedRooms, this.data.active_chat, this.data.rooms);
  }

  handleProfiles(profiles) {
    _.forOwn(this.data.rooms.people, (chat) => {
      let name = _.get(profiles, `["${chat.jid}"].name`);
      if (name) {
        chat.name = name;
      }
    });
    this.set({
      rooms: this.data.rooms
    });
  }

  getRoomIndex(jid){
    return this.data.room_order.indexOf(jid);
  }

  getNextRoom(jid) {
    var nextRoom, idx;
    if (this.data.room_order.length) {
      idx = this.getRoomIndex(jid);
      if (idx >= 0) {
        if (idx === this.data.room_order.length - 1) {
          idx--;
        } else {
          idx++;
        }
        if (idx > -1) {
          nextRoom = this.data.room_order[idx];
        }
      }
    }
    return nextRoom || "lobby";
  }

  handleRoomClosed(jid) {
    let index = this.getRoomIndex(jid);
    if (index !== -1){
          this.local.closedChatsIndex[jid] = index;
    }
    if (jid === this.data.active_chat) {
      var data = {
        jid: this.getNextRoom(jid),
        isClosed: true
      };
      AppDispatcher.dispatch('set-route', data);
      AnalyticsDispatcher.dispatch('analytics-select-room', data);
    }
    AppDispatcher.dispatch('close-file-viewer');
  }

  handleSelectRoom(jid) {
    var inRoster = _.find(this.data.rooms.rooms, {jid: jid}) || _.find(this.data.rooms.people, {jid: jid});
    var selectedJid = inRoster || utils.jid.is_search(jid) ? jid : 'lobby';
    _.map(this.data.rooms, (group) => {
      _.assign(_.find(group, (room) => {
        return room.jid === jid;
      }));
    });
    this.set({
      rooms: this.data.rooms,
      active_chat: selectedJid
    });
    this.setRoomOrder();
    if (this.hc_init_complete) {
      this.savePrefsDebounced();
    }
  }

  navigateRooms(instructions) {
    var roomIndex = _.findIndex(this.data.room_order, (jid) => {
      return jid === this.data.active_chat;
    });

    if (instructions.direction === "up") {
      this.navigateRoomsUp(roomIndex);
    } else if (instructions.direction === "down") {
      this.navigateRoomsDown(roomIndex);
    } else if (instructions.direction === "top") {
      this.navigateToTopChat();
    } else if (instructions.direction === "bottom") {
      this.navigateToBottomChat();
    } else if (instructions.direction === "index") {
      this.navigateToChatAtIndex(instructions.index);
    }

    AppDispatcher.dispatch('close-file-viewer');
  }

  navigateToTopChat() {
    let newJid = _.head(this.data.room_order);
    if (newJid && newJid !== this.data.active_chat) {
      AppDispatcher.dispatch('set-route', {
        jid: newJid
      });
    }
  }

  navigateToBottomChat() {
    let newJid = _.last(this.data.room_order);
    if (newJid && newJid !== this.data.active_chat) {
      AppDispatcher.dispatch('set-route', {
        jid: newJid
      });
    }
  }

  navigateToChatAtIndex(index) {
    let newJid = this.data.room_order[index];
    if (newJid && newJid !== this.data.active_chat) {
      AppDispatcher.dispatch('set-route', {
        jid: newJid
      });
    }
  }

  navigateRoomsUp(roomIndex) {
    var newJid;
    if (roomIndex === -1 && utils.jid.is_lobby(this.data.active_chat)) {
      newJid = this.data.room_order[this.data.room_order.length - 1];
    } else if (roomIndex === 0) {
      newJid = "lobby";
    } else {
      newJid = this.data.room_order[roomIndex - 1];
    }

    if (newJid) {
      AppDispatcher.dispatch('set-route', {
        jid: newJid
      });
    }
  }

  navigateRoomsDown(roomIndex) {
    var newJid;
    if (roomIndex === -1 && utils.jid.is_lobby(this.data.active_chat)) {
      newJid = this.data.room_order[0];
    } else if (roomIndex === this.data.room_order.length - 1) {
      newJid = "lobby";
    } else {
      newJid = this.data.room_order[roomIndex + 1];
    }

    if (newJid) {
      AppDispatcher.dispatch('set-route', {
        jid: newJid
      });
    }
  }

  /* Takes array of room jids */
  updateRoomOrder(jids) {
    let currentRoomData = [];
    let fullRoomData;
    let rooms;

    currentRoomData = currentRoomData.concat(this.data.rooms["rooms"], this.data.rooms["people"]);
    fullRoomData = _.map(jids, (jid) => {
      return _.find(currentRoomData, function (item) {
        return item.jid === jid;
      });
    });
    rooms = _.groupBy(fullRoomData, function (chat) {
      return chat.type === 'groupchat' ? 'rooms' : 'people';
    });
    this.saveRooms(fullRoomData, this.data.active_chat, rooms);
  }

  saveRooms(roomData, activeChat, roomObj) {
    var autoJoin = _.map(roomData, function (room) {
      return {
        jid: room.jid,
        name: room.name
      };
    });

    this.set({
      rooms: roomObj,
      active_chat: activeChat
    });
    this.local.auto_join = (autoJoin.length) ? autoJoin : false;
    if (this.hc_init_complete) {
      this.savePrefsDebounced();
      this.setRoomOrder();
    }
  }

  savePrefs() {
    var prefs = {};

    prefs["autoJoin"] = this.local.auto_join;
    if (this.data.active_chat !== 'search') {
      prefs["chatToFocus"] = this.data.active_chat;
    }

    PreferencesActions.savePreferences(prefs);
  }

  handleDragStart(target) {
    if (target) {
      this.set({
        drag_target: target,
        dragging: true
      });
    }
  }

  handleDragOver(event) {
    if (event && event.target && event.clientY) {
      this.set({
        drag_over_target: event.target,
        drag_over_clientY: event.clientY,
        dragging: true
      });
    }
  }

  handleDragEnd() {
    this.set({
      drag_over_target: false,
      drag_over_clientY: false,
      dragging: false
    });
  }

}

module.exports = new RoomsNavStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/rooms_nav_store.js
 **/