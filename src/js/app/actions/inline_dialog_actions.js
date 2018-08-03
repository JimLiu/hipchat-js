import AppDispatcher from 'dispatchers/app_dispatcher';
import InlineDialogStore from 'stores/inline_dialog_store';

export default {

  hideInlineDialog: function() {
    AppDispatcher.dispatch('hide-inline-dialog', {
      dialog_type: InlineDialogStore.getCurrentInlineDialog()
    });
  },

  toggleInlineDialog: function(dialogType, data) {
    AppDispatcher.dispatch('toggle-inline-dialog', {
      dialog_type: dialogType,
      current_dialog_type: InlineDialogStore.getCurrentInlineDialog(),
      dialog_data: data
    });
  },

  showUserStatusMessage: function(data) {
    AppDispatcher.dispatch("show-inline-dialog", {
      dialog_type: "user-status-message-inline-dialog",
      dialog_data: data
    });
  },

  showConnectionStatusMessage: function (data) {
    AppDispatcher.dispatch("show-inline-dialog", {
      dialog_type: "connection-status-message-inline-dialog",
      dialog_data: data
    });
  },

  showGuestAccessInformation: function (data) {
    AppDispatcher.dispatch("show-inline-dialog", {
      dialog_type: "guest-access-information-inline-dialog",
      dialog_data: data
    });
  },

  showAddIntegrationsHelperDialog: function(data) {
    AppDispatcher.dispatch("show-inline-dialog", {
      dialog_type: "add-integrations-help-dialog",
      dialog_data: data
    });
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/inline_dialog_actions.js
 **/