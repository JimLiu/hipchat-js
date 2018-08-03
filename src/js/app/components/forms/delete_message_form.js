import FormActions from 'actions/form_actions';
import DialogActions from 'actions/dialog_actions';
import Message from 'components/chat_window/message_types/message';

export default React.createClass({

  displayName: 'DeleteMessageForm',

  _onSubmit(evt) {
    evt.preventDefault();
    FormActions.deleteMessage(this.props.message);
    DialogActions.closeDialog();
  },

  _renderMessage() {
    let msg = this.props.message;
    return (
      <Message key={'msg-' + msg.mid} ref={'msg_' + msg.mid} msg={msg} />
    );
  },

  render() {
    let renderedMessage = this._renderMessage();
    return (
      <form id='delete-message-form'
            ref='delete_message_form'
            className='aui'
            onSubmit={this._onSubmit}>
        {renderedMessage}
      </form>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/delete_message_form.js
 **/