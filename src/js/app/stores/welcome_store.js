import AppDispatcher from 'dispatchers/app_dispatcher';
import Store from 'lib/core/store';
import AppConfig from 'config/app_config';
import strings from 'strings/dialog_strings';
import DAL from 'core/dal';
import AppStore from 'stores/application_store';

class WelcomeStore extends Store {

  constructor() {
    super();
    this.local = {
      welcome_init: false
    };
  }

  getDefaults() {
    return {
      steps: [
        'welcome',
        'people',
        'rooms',
        'message'
      ],
      current_step: 'welcome',
      people: {},
      rooms: {},
      selected_people: [],
      selected_rooms: [],
      welcome_message: strings.welcome_messages(),
      is_first_selection: true,
      current_user_jid: '',
      max_length_of_welcome_message: AppConfig.welcome_dialog.max_length_of_welcome_message,
      max_amount_of_people_icons: AppConfig.welcome_dialog.max_amount_of_people_icons,
      is_welcome_message_too_long: false,
      roster: {},
      smileys: {},
      new_forced_caret_position: 0
    };
  }

  registerListeners() {
    AppDispatcher.registerOnce({
      'hc-init': (data) => {
        this.set({
          current_user_jid: data.jid
        });
      },
      'welcome-init': () => {
        this.local.welcome_init = true;
        this._handleRoster();
        this._handleAllRooms();
      }
    });

    AppDispatcher.register({
      'updated:roster': (roster) => {
        if (this.local.welcome_init) {
          this._handleRoster(roster);
        }
      },
      'updated:allRooms': (allRooms) => {
        if (this.local.welcome_init) {
          this._handleAllRooms(allRooms);
        }
      },
      'updated:smileys': (data) => {
        let smileys = _.keyBy(_.keyBy(data, 'file'), 'shortcut');
        this.set({ smileys });
      },
      'welcome-select-people': (jid) => {
        this._selectPeople(jid);
      },
      'welcome-unselect-people': (jid) => {
        this._unselectPeople(jid);
      },
      'welcome-select-rooms': (jid) => {
        this._selectRooms(jid);
      },
      'welcome-unselect-rooms': (jid) => {
        this._unselectRooms(jid);
      },
      'welcome-change-message': (welcome_message) => {
        this._changeWelcomeMessage(welcome_message);
      },
      'smiley-chosen': (data) => {
        this.handleSmileyChosen(data);
      },
      'reset-new-forced-caret-position': () => {
        this.set('new_forced_caret_position', 0);
      },
      'welcome-is-message-too-long': (data) => {
        this.set('is_welcome_message_too_long', data);
      },
      'welcome-change-current-step': (data) => {
        this.set('current_step', data);
      },
      'welcome-clear-people-selection': () => {
        this.set('selected_people', []);
      },
      'welcome-clear-rooms-selection': () => {
        this.set('selected_rooms', []);
      }
    });
  }

  _handleRoster(roster = {}) {
    let people = this.data.people,
        currentUserJid = this.data.current_user_jid,
        maxDisplayedPeople = AppConfig.welcome_dialog.max_displayed_people;

    if (_.isEmpty(roster)){
      roster = AppStore.get('roster');
    }

    if (_.size(people) < maxDisplayedPeople && currentUserJid !== '') {

      _.each(roster, (value, key) => {
        if (_.size(people) < maxDisplayedPeople && currentUserJid !== key && !people[key]) {
          people[key] = {};

          AppDispatcher.dispatch('request-profile', key, (response) => {
            people[key] = response.query;
            people[key].jid = roster[key].jid;
            people[key].id = roster[key].id;
            people[key].presence = roster[key].presence;
            this.set({
              people: people
            });
          });
        }
      });
    }
    this.set({
      roster: roster
    });
  }

  _handleAllRooms(allRooms = {}) {
    let rooms = this.data.rooms,
        maxDisplayedRooms = AppConfig.welcome_dialog.max_displayed_rooms;

    if (_.isEmpty(allRooms)){
      allRooms = AppStore.get('allRooms');
    }

    if (_.size(rooms) < maxDisplayedRooms) {

      _.each(allRooms, (value, key) => {
        if (_.size(rooms) < maxDisplayedRooms && allRooms[key].privacy === 'public' && !rooms[key]) {
          rooms[key] = {};

          AppDispatcher.dispatch('fetch-room', key, (nul, room) => {
            if (room) {
              rooms[key].jid = room.jid;
              rooms[key].name = room.name;
              rooms[key].topic = room.topic;
              rooms[key].privacy = room.privacy;
              rooms[key].avatar_url = room.avatar_url;
              this.set({
                rooms: rooms
              });
            }
          });

          DAL.fetchParticipants(allRooms[key].id)
            .then((response) => {
              rooms[key].participants_fetched = [];
              _.each(response.participants, (value1, key1) => {
                rooms[key].participants_fetched.push(value1.xmpp_jid);
              });
              this.set({
                rooms: rooms
              });
            });
        }
      });
    }
  }

  handleSmileyChosen(data) {
    var welcome_message = this.data.welcome_message + data.shortcut + ' ';
    this.set({
      welcome_message: welcome_message,
      new_forced_caret_position: welcome_message.length
    });
  }

  _selectPeople(jid) {
    let selectedPeople = this.get('selected_people');

    if (selectedPeople.indexOf(jid) === -1) {
      selectedPeople.push(jid);
      this.set({
        selected_people: selectedPeople
      });
    }

    if (this.data.is_first_selection === true) {
      this.set({
        is_first_selection: false
      });
    }
  }

  _unselectPeople(jid) {
    let selectedPeople = this.get('selected_people');

    if (selectedPeople.indexOf(jid) !== -1) {
      this.set({
        selected_people: selectedPeople.filter((value) => value !== jid)
      });
    }
  }

  _selectRooms(jid) {
    let selectedRooms = this.get('selected_rooms');

    if (selectedRooms.indexOf(jid) === -1) {
      selectedRooms.push(jid);
      this.set({
        selected_rooms: selectedRooms
      });
    }
  }

  _unselectRooms(jid) {
    let selectedRooms = this.get('selected_rooms');

    if (selectedRooms.indexOf(jid) !== -1) {
      this.set({
        selected_rooms: selectedRooms.filter((value) => value !== jid)
      });
    }
  }

  _changeWelcomeMessage(message) {
    this.set({
      welcome_message: message
    });
  }
}

export default new WelcomeStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/welcome_store.js
 **/