import ModalDialogStore from "stores/modal_dialog_store";
import SettingsDialog from "components/dialogs/settings_dialog/settings_dialog";
import appConfig from "config/app_config";
import InviteUserDialog from "components/dialogs/invite_user_dialog/invite_user_dialog";
import RemoveUserDialog from "components/dialogs/remove_user_dialog/remove_user_dialog";
import CreateRoomDialog from "components/dialogs/create_room_dialog/create_room_dialog";
import RoomPrivacyDialog from "components/dialogs/room_privacy_dialog/room_privacy_dialog";
import RenameRoomDialog from "components/dialogs/rename_room_dialog/rename_room_dialog";
import DeleteRoomDialog from "components/dialogs/delete_room_dialog/delete_room_dialog";
import RoomInviteDialog from "components/dialogs/room_invite_dialog/room_invite_dialog";
import ArchiveRoomDialog from 'components/dialogs/archive_room_dialog/archive_room_dialog';
import Desktop4Dialog from 'components/dialogs/desktop_4_dialog/desktop_4_dialog';
import AddonDialog from "components/dialogs/addon_dialog/addon_dialog";
import QuickSwitcherDialog from "components/quick_switcher/quick_switcher_dialog";
import InviteTeammatesDialog from "components/dialogs/invite_teammates_dialog/invite_teammates_dialog";
import DisableGuestAccessDialog from 'components/dialogs/guest_access_dialog/guest_access_dialog';
import RoomNotificationsDialog from 'components/dialogs/room_notifications_dialog/room_notifications_dialog';
import KeyboardShortcutsDialog from 'components/dialogs/keyboard_shortcuts_dialog/keyboard_shortcuts_dialog';
import ReleaseNotesDialog from 'components/dialogs/release_notes_dialog/release_notes_dialog';
import IntegrationDialog from 'components/dialogs/integration_dialog/integration_dialog';
import IntegrationsManagementDialog from 'components/dialogs/integrations_dialog/integrations_management_dialog';
import EditMessageDialog from 'components/dialogs/edit_message_dialog/edit_message_dialog';
import DeleteMessageDialog from 'components/dialogs/delete_message_dialog/delete_message_dialog';
import NotEditableDialog from 'components/dialogs/edit_message_dialog/not_editable_dialog';
import WelcomeDialog from 'components/dialogs/welcome_dialog/welcome_dialog';
import ModalBackdrop from "./modal_backdrop";

export default React.createClass({

  displayName: "ModalDialogContainer",

  componentDidMount: function() {
    ModalDialogStore.on('change', this._onChange);
  },

  componentWillUnmount: function() {
    ModalDialogStore.off('change', this._onChange);
  },

  getInitialState: function() {
    return ModalDialogStore.getAll();
  },

  _onChange: function() {
    this.setState(ModalDialogStore.getAll());
  },

  _getDialogBackdrop: function() {
    var dialogData = this.state.dialogData || {},
        bgDismiss = dialogData.bgDismiss === false ? dialogData.bgDismiss : appConfig.default_backdrop_dismiss_on_click;

    return <ModalBackdrop btnLoading={this.state.btnLoading}
                          bgDismiss={bgDismiss} />;
  },

  _getDialog: function() {
    var currentDialogId = ModalDialogStore.getCurrentModalDialog();
    var currentDialog = false;

    if (currentDialogId) {
      switch (currentDialogId) {
        case "room-notifications-dialog":
          currentDialog = <RoomNotificationsDialog {...this.state.dialogData} />;
          break;

        case "settings-dialog":
          currentDialog = <SettingsDialog {...this.state.dialogData}/>;
          break;

        case "invite-users-dialog":
          currentDialog = <InviteUserDialog {...this.state.dialogData}/>;
          break;

        case "remove-users-dialog":
          currentDialog = <RemoveUserDialog {...this.state.dialogData}/>;
          break;

        case "create-room-dialog":
          currentDialog = <CreateRoomDialog {...this.state.dialogData} btnLoading={this.state.btnLoading}/>;
          break;

        case "room-privacy-dialog":
          currentDialog = <RoomPrivacyDialog {...this.state.dialogData} btnLoading={this.state.btnLoading}/>;
          break;

        case "rename-room-dialog":
          currentDialog = <RenameRoomDialog {...this.state.dialogData} btnLoading={this.state.btnLoading}/>;
          break;

        case "delete-room-dialog":
          currentDialog = <DeleteRoomDialog {...this.state.dialogData} btnLoading={this.state.btnLoading}/>;
          break;

        case "room-invite-dialog":
          currentDialog = <RoomInviteDialog {...this.state.dialogData}/>;
          break;

        case "archive-room-dialog":
          currentDialog = <ArchiveRoomDialog {...this.state.dialogData}/>;
          break;

        case "disable-guest-dialog":
          currentDialog = <DisableGuestAccessDialog {...this.state.dialogData}/>;
          break;

        case "addon-dialog":
          currentDialog = <AddonDialog {...this.state.dialogData}/>;
          break;

        case "invite-teammates-dialog":
          currentDialog = <InviteTeammatesDialog {...this.state.dialogData} web_server={this.state.web_server}/>;
          break;

        case "keyboard-shortcuts-dialog":
          currentDialog = <KeyboardShortcutsDialog {...this.state.dialogData}/>;
          break;

        case "release-notes-dialog":
          currentDialog = <ReleaseNotesDialog {...this.state.dialogData}/>;
          break;

        case "quick-switcher-dialog":
          currentDialog = <QuickSwitcherDialog {...this.state.dialogData}/>;
          break;

        case "integration-dialog":
          currentDialog = <IntegrationDialog {...this.state.dialogData}/>;
          break;

        case "desktop-4-dialog":
          currentDialog = <Desktop4Dialog {...this.state.dialogData} />;
          break;

        case "integrations-management-dialog":
          currentDialog = <IntegrationsManagementDialog {...this.state.dialogData} />;
          break;

        case "edit-message-dialog":
          currentDialog = <EditMessageDialog {...this.state.dialogData} />;
          break;

        case "delete-message-dialog":
          currentDialog = <DeleteMessageDialog {...this.state.dialogData} />;
          break;

        case "not-editable-dialog":
          currentDialog = <NotEditableDialog {...this.state.dialogData} />;
          break;

        case "welcome-dialog":
          currentDialog = <WelcomeDialog {...this.state.dialogData} />;
          break;

      }
    }

    return currentDialog;
  },

  render: function() {
    var dialog = this._getDialog(),
        dialogBackdrop;


    if (dialog) {
      dialogBackdrop = this._getDialogBackdrop();
    }

    return (
      // we use key here to draw new backdrop for each new dialog
      <div key={this.state.activeDialog}>
        {dialog}
        {dialogBackdrop}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/modal_dialog/modal_dialog_container.js
 **/