import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';

export default {

  changeRoomPrivacy: function (submit_data, callback) {
    AppDispatcher.dispatch("change-room-privacy", submit_data, callback);
  },

  changeRoomName: function (submit_data, callback) {
    AppDispatcher.dispatch("change-room-name", submit_data, callback);
  },

  createRoom: function (submit_data, callback) {
    AppDispatcher.dispatch("create-room", submit_data, callback);
    AnalyticsDispatcher.dispatch("analytics-create-room", submit_data);
  },

  inviteUsers: function (submit_data) {
    AppDispatcher.dispatch('invite-users', submit_data);
  },

  removeUsers: function (submit_data, callback) {
    AppDispatcher.dispatch('remove-users', submit_data, callback);
  },

  editMessage: function(submit_data) {
    AppDispatcher.dispatch('edit-message', submit_data);
  },

  deleteMessage: function(submit_data) {
    AppDispatcher.dispatch('delete-message', submit_data);
  }

};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/form_actions.js
 **/