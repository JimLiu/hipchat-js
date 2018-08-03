import ModalDialog from "components/common/modal_dialog/modal_dialog";
import EditMessageForm from "components/forms/edit_message_form";
import strings from 'strings/dialog_strings';
import ieSubmitMixin from 'components/mixins/ie_submit_mixin';
import DialogVisibilityMixin from 'components/mixins/modal_dialog_visibility_mixin';

export default React.createClass({

  displayName: "EditMessageDialog",

  mixins: [ieSubmitMixin, DialogVisibilityMixin],

  getInitialState: function () {
    return this._getState();
  },

  _getState: function () {
    return {
      dialogButtonInactive: true
    };
  },

  _dialogBody: function () {
    return (
      <EditMessageForm message={this.props.message}
        activateDialogButton={this._activateDialogButton}
        deactivateDialogButton={this._deactivateDialogButton} />
    );
  },

  _activateDialogButton: function(){
    this.setState({
      dialogButtonInactive: false
    });
  },

  _deactivateDialogButton: function(){
    this.setState({
      dialogButtonInactive: true
    });
  },

  _dialogFooterButton: function () {
    return (
      <button form="edit-message-form" className="aui-button aui-button-primary" aria-disabled={this.state.dialogButtonInactive} type="submit" onClick={this.ieSubmit}>{strings.save}</button>
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="edit-message-dialog"
                   title={strings.edit_message}
                   dialogBody={this._dialogBody}
                   dialogFooterButton={this._dialogFooterButton}
                   closeLinkText="Cancel" />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/edit_message_dialog/edit_message_dialog.js
 **/