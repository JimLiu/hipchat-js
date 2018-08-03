var ModalDialog = require("components/common/modal_dialog/modal_dialog"),
    strings = require('strings/dialog_strings'),
    RemoveUsersForm = require("components/forms/remove_users_form"),
    ieSubmitMixin = require('components/mixins/ie_submit_mixin');

module.exports = React.createClass({

  displayName: "RemoveUserDialog",

  mixins: [ieSubmitMixin],

  _dialogTitle: function () {
    return strings.choose_removed_members;
  },

  _dialogBody: function () {
    return (
      <RemoveUsersForm />
    );
  },

  _dialogFooterButton: function () {
    return (
      <button form="remove-users-form" className="aui-button aui-button-primary" type="submit" onClick={this.ieSubmit}>{strings.ok}</button>
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="remove-users-dialog"
        title={this._dialogTitle()}
        dialogBody={this._dialogBody}
        dialogFooterButton={this._dialogFooterButton}
        closeLinkText="Cancel"
        size="small" />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/remove_user_dialog/remove_user_dialog.js
 **/