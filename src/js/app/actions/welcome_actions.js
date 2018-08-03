import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import WelcomeStore from 'stores/welcome_store';

export default {

  dialogRendered: function() {
    AppDispatcher.dispatch('welcome-init');
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.welcome.dialog.render'
    });
  },

  selectPeopleItem: function(jid) {
    AppDispatcher.dispatch('welcome-select-people', jid);
  },

  unselectPeopleItem: function(jid) {
    AppDispatcher.dispatch('welcome-unselect-people', jid);
  },

  selectRoomsItem: function(jid) {
    AppDispatcher.dispatch('welcome-select-rooms', jid);
  },

  unselectRoomsItem: function(jid) {
    AppDispatcher.dispatch('welcome-unselect-rooms', jid);
  },

  changeWelcomeMessage: function(welcome_message) {
    AppDispatcher.dispatch('welcome-change-message', welcome_message);
  },

  createChats: function(data) {
    let welcomeMessage = WelcomeStore.get('welcome_message');

    data.source = "welcome_dialog";
    AnalyticsDispatcher.dispatch('analytics-open-room', data);

    switch (true) {
      case (welcomeMessage === ''):
        AnalyticsDispatcher.dispatch("analytics-event", {
          name: 'hipchat.client.welcome.dialog.message.skip',
          properties: {
            step: 'message',
            message: welcomeMessage
          }
        });
        break;
      case (welcomeMessage !== ''):
        AnalyticsDispatcher.dispatch("analytics-event", {
          name: 'hipchat.client.welcome.dialog.message.finish',
          properties: {
            step: 'message',
            message: welcomeMessage
          }
        });
        break;
    }

    AppDispatcher.dispatch('set-multiple-routes', data);
  },

  closeDialog: function() {
    AppDispatcher.dispatch('hide-modal-dialog');
  },

  skipDialog: function() {
    AppDispatcher.dispatch('hide-modal-dialog');
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: 'hipchat.client.welcome.dialog.welcome.skip',
      properties: {
        step: 'welcome'
      }
    });
  },

  resetNewForcedCaretPosition: function() {
    AppDispatcher.dispatch('reset-new-forced-caret-position');
  },

  toggleTooltip(data) {
    AppDispatcher.dispatch('toggle-tooltip', data);
  },

  setIsWelcomeMessageTooLong(data) {
    AppDispatcher.dispatch('welcome-is-message-too-long', data);
  },

  nextStep(data) {
    let currentStep = WelcomeStore.get('current_step');

    switch (currentStep) {
      case 'welcome':
        AnalyticsDispatcher.dispatch("analytics-event", {
          name: 'hipchat.client.welcome.dialog.welcome.start',
          properties: {
            step: currentStep
          }
        });
        break;
      case 'people':
        AnalyticsDispatcher.dispatch("analytics-event", {
          name: 'hipchat.client.welcome.dialog.people.next',
          properties: {
            step: currentStep,
            selected: WelcomeStore.get('selected_people').length
          }
        });
        break;
      case 'rooms':
        AnalyticsDispatcher.dispatch("analytics-event", {
          name: 'hipchat.client.welcome.dialog.rooms.next',
          properties: {
            step: currentStep,
            selected: WelcomeStore.get('selected_rooms').length
          }
        });
        break;
    }

    AppDispatcher.dispatch('welcome-change-current-step', data);
  },

  skipThisStep(data) {
    let currentStep = WelcomeStore.get('current_step');

    switch (currentStep) {
      case 'people':
        AnalyticsDispatcher.dispatch("analytics-event", {
          name: 'hipchat.client.welcome.dialog.people.skip',
          properties: {
            step: currentStep
          }
        });
        break;
      case 'rooms':
        AnalyticsDispatcher.dispatch("analytics-event", {
          name: 'hipchat.client.welcome.dialog.rooms.skip',
          properties: {
            step: currentStep,
          }
        });
        break;
    }

    AppDispatcher.dispatch('welcome-change-current-step', data);
  },

  sendMessage(data) {
    AppDispatcher.dispatch('send-message', data);
    AnalyticsDispatcher.dispatch('analytics-send-message', data);
  },

  clearPeopleSelection() {
    AppDispatcher.dispatch('welcome-clear-people-selection');
  },

  clearRoomsSelection() {
    AppDispatcher.dispatch('welcome-clear-rooms-selection');
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/welcome_actions.js
 **/