import Store from "lib/core/store";
import AppStore from "stores/application_store";
import dispatcher from "dispatchers/app_dispatcher";
import AppConfig from 'config/app_config';

class FormsStore extends Store {

  constructor() {
    super();
  }

  getDefaults() {
    return {
      activeChat: null,
      activeChatParticipants: [],
      roomNames: [],
      users: {},
      user_is_admin: false,
      web_server: AppConfig.default_web_server,
      invite_url: false
    };
  }

  registerListeners() {

    dispatcher.registerOnce({
      'hc-init': (data) => {
        this.set({
          user_is_admin: data.is_admin,
          invite_url: data.invite_url
        });
      }
    });

    dispatcher.register({
      'updated:activeRooms': () => {
        if (this.data.activeChat) {
          this.handleActiveChatUpdate(this.data.activeChat.jid);
        }
      },
      'updated:allRooms': (rooms) => {
        this.handleAllRoomsUpdate(rooms);
      },
      'updated:roster': (roster) => {
        this.handleRosterUpdate(roster);
      },
      'updated:active_chat': (active_chat_jid) => {
        this.handleActiveChatUpdate(active_chat_jid);
      },
      'updated:web_server': (web_server) => {
        this.set("web_server", web_server);
      }
    });
  }

  handleAllRoomsUpdate(rooms) {
    var roomNames = _.map(rooms, 'name');
    this.set("roomNames", roomNames);
  }

  handleRosterUpdate(roster) {
    var users = _.keyBy(_.map(roster, (user) => {
      let is_guest = !!user.is_guest;

      return {
        name: user.name,
        jid: user.jid,
        id: Number(user.id),
        is_guest
      };

    }), "jid");

    this.set("users", users);
  }

  handleActiveChatUpdate(active_chat_jid) {
    var active_chat,
        active_chat_participants = [],
        active_rooms = AppStore.get("activeRooms");

    if (active_rooms) {
      active_chat = active_rooms[active_chat_jid];
      if (active_chat) {
        this.set({
          activeChat: active_chat
        });
        _.each(active_chat.participants, (group) => {
          _.each(group, (jid) => {
            active_chat_participants.push(jid);
          });
        });
      }
      if (active_chat_participants.length) {
        this.set({
          activeChatParticipants: active_chat_participants
        });
      }
    }
  }
}

module.exports = new FormsStore();


/** WEBPACK FOOTER **
 ** ./src/js/app/stores/forms_store.js
 **/