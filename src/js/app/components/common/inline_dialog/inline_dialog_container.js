import InlineDialogStore from "stores/inline_dialog_store";
import UserStatusMessageForm from "components/app_header/user_status_message_form";
import ConnectionStatusMessage from 'components/app_header/connection_status_message';
import GuestAccessInformation from 'components/chat_header/guest_access_information';
import AddIntegrationsDiscover from 'components/tooltip/tooltip_types/add_integrations_discover';
import cx from 'classnames';

export default React.createClass({

  displayName: "InlineDialogContainer",

  componentDidMount: function() {
    InlineDialogStore.on('change', this._onChange);
  },

  componentWillUnmount: function() {
    InlineDialogStore.off('change', this._onChange);
  },

  getInitialState: function() {
    return InlineDialogStore.getAll();
  },

  _onChange: function() {
    this.setState(InlineDialogStore.getAll());
  },

  _getDialog: function() {
    var currentDialogId = this.state.activeDialog;
    var currentDialog = false;

    if (currentDialogId) {
      switch (currentDialogId) {

        case "user-status-message-inline-dialog":
          currentDialog = <UserStatusMessageForm {...this.state.dialogData} />;
          break;

        case "connection-status-message-inline-dialog":
          currentDialog = <ConnectionStatusMessage {...this.state.dialogData} />;
          break;

        case "guest-access-information-inline-dialog":
          currentDialog = <GuestAccessInformation {...this.state.dialogData} />;
          break;

        case "add-integrations-help-dialog":
          currentDialog = <AddIntegrationsDiscover {...this.state.dialogData} />;
          break;
      }
    }

    return currentDialog;
  },

  _isDialogInvisible: function(dialogId) {
    return this.state.activeDialog !== dialogId;
  },

  render: function() {

    var classes = cx({
      'banner-shown': this.state.bannerShown
    });

    var dialog = this._getDialog();

    return (
      <div className={classes}>
        {dialog}
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/inline_dialog/inline_dialog_container.js
 **/