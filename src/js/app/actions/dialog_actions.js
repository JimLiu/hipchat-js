/**
 * DialogActions
 *
 * Exposed a window. Used for exposing actions to non react managed actions
 * like mention clicks, etc.
 */

import AppDispatcher from 'dispatchers/app_dispatcher';
import AppHeaderStore from 'stores/app_header_store';

export default {

  closeDialog: function() {
    AppDispatcher.dispatch("hide-modal-dialog");
  },

  /*
   showAddonDialog

   Display an ADG dialog overlayed over the chat, with the content provided by an add-on.

   @param {object} data - Object with properties addon_key, addon_url, addon_options & module_key.
    addon_key: identifier as in the add-on's the descriptor
    addon_url: url from with the dialog content will be retrieved via HTTP GET
    addon_options: object representing UI toggles: {
                       resize (boolean) - enable / disable the auto-resizer
                       width / height - as pixels or % of the web client
                       chrome (boolean) - if the dialog should have a header and footer
                       header (text) - the text to be written into the dialog header
                    }
    module_key: identifier of the add-on module corresponding to the dialog, as in its descriptor
   */
  showAddonDialog: function(data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "addon-dialog",
      dialog_data: {
        addon_key: data.addon_key,
        module_key: data.module_key,
        addon_url: data.addon_url,
        addon_options: data.addon_options
      }
    });
  },

  showIntegrationDialog: function(data){
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "integration-dialog",
      dialog_data: data
    });
  },

  showIntegrationsManagementDialog: function(data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "integrations-management-dialog",
      dialog_data: data
    });
  },

  startBtnLoading: function() {
    AppDispatcher.dispatch("modal-dialog-btn-loading", {
      loading: true
    });
  },

  stopBtnLoading: function() {
    AppDispatcher.dispatch("modal-dialog-btn-loading", {
      loading: false
    });
  },

  showSettingDialog: function(data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "settings-dialog",
      dialog_data: data
    });
  },

  showInviteTeammatesDialog: function (data) {
    var user_is_admin = AppHeaderStore.get("user_is_admin"),
        invite_url = AppHeaderStore.get("invite_url");

    if (user_is_admin || invite_url) {
      AppDispatcher.dispatch("show-modal-dialog", {
        dialog_type: "invite-teammates-dialog",
        dialog_data: data || {}
      });
    }
  },

  showInviteUsersDialog: function (data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "invite-users-dialog",
      dialog_data: data || false
    });
  },

  showRemoveUsersDialog: function () {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "remove-users-dialog",
      dialog_data: false
    });
  },

  showCreateRoomDialog: function (data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "create-room-dialog",
      dialog_data: data || false
    });
  },

  showRoomPrivacyDialog: function (data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "room-privacy-dialog",
      dialog_data: data
    });
  },

  showRenameRoomDialog: function (data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "rename-room-dialog",
      dialog_data: data
    });
  },

  showDeleteRoomDialog: function (data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "delete-room-dialog",
      dialog_data: data
    });
  },

  showArchiveRoomDialog: function (data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "archive-room-dialog",
      dialog_data: data
    });
  },

  showDisableGuestAccessDialog: function () {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "disable-guest-dialog",
      dialog_data: false
    });
  },

  showRoomNotificationsDialog: function (data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "room-notifications-dialog",
      dialog_data: data
    });
  },

  showKeyboardShortcutsDialog: function (shortcuts) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "keyboard-shortcuts-dialog",
      dialog_data: {
        shortcuts: shortcuts
      }
    });
  },

  showQuickSwitcherDialog: function(hideHint = false) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "quick-switcher-dialog",
      dialog_data: {
        bgDismiss: true,
        hideHint: (hideHint === true)
      }
    });
  },

  showReleaseNotesDialog: function () {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "release-notes-dialog",
      dialog_data: {
        bgDismiss: true
      }
    });
  },

  showDesktop4Dialog: function (data) {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "desktop-4-dialog",
      dialog_data: data
    });
  },

  showEditMessageDialog: function(data) {
    if (!data) {
      return;
    }
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "edit-message-dialog",
      dialog_data: {
        bgDismiss: false,
        message: data
      }
    });
  },

  showDeleteMessageDialog: function(data) {
    if (!data) {
      return;
    }
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "delete-message-dialog",
      dialog_data: {
        bgDismiss: false,
        message: data
      }
    });
  },

  showNotEditableDialog: function(data) {
    if (!data) {
      return;
    }
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "not-editable-dialog",
      dialog_data: {
        action: data.action
      }
    });
  },

  showWelcomeDialog: function() {
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "welcome-dialog",
      dialog_data: false
    });
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/dialog_actions.js
 **/