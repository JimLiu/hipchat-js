import AppDispatcher from 'dispatchers/app_dispatcher';

export default {

  initiateMessageEdit: function(msg) {
    AppDispatcher.dispatch('initiate-edit-message', msg);
  },

  initiateMessageDelete: function(msg) {
    AppDispatcher.dispatch('initiate-delete-message', msg);
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/message_actions.js
 **/