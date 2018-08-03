import ModalDialog from 'components/common/modal_dialog/modal_dialog';
import DeleteMessageForm from 'components/forms/delete_message_form';
import strings from 'strings/dialog_strings';
import cx from 'classnames';

export default React.createClass({

  displayName: 'DeleteMessageDialog',

  _dialogBody: function () {
    return (
      <DeleteMessageForm message={this.props.message} />
    );
  },

  _dialogFooterButtons: function () {
    let btnClasses = cx({
      'aui-button': true
    });

    return (
      <button form="delete-message-form" className={btnClasses} type="submit">{strings.delete}</button>
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="delete-message-dialog"
                   isWarning="true"
                   title={strings.delete_message}
                   dialogBody={this._dialogBody}
                   dialogFooterButton={this._dialogFooterButtons}
                   closeLinkText={strings.cancel}
                   hint={strings.edit_message_hint} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/delete_message_dialog/delete_message_dialog.js
 **/