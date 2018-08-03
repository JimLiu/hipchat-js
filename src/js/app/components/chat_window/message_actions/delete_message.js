import strings from 'strings/chat_input_strings';
import MessageActions from 'actions/message_actions';

export default React.createClass({

  displayName: "DeleteMessage",

  propTypes: {
    msg: React.PropTypes.shape({
      mid: React.PropTypes.string,
      room: React.PropTypes.string,
      body: React.PropTypes.string
    })
  },

  render() {
    return <a title={strings.delete_message} onClick={this._onClick}>
             {strings.delete_message}
           </a>;
  },

  _onClick() {
    MessageActions.initiateMessageDelete(this.props.msg);
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_actions/delete_message.js
 **/