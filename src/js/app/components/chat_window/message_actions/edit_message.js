import strings from 'strings/chat_input_strings';
import MessageActions from 'actions/message_actions';

export default React.createClass({

  displayName: "EditMessage",

  propTypes: {
    msg: React.PropTypes.shape({
      mid: React.PropTypes.string,
      room: React.PropTypes.string,
      body: React.PropTypes.string
    })
  },

  render() {
    return <a title={strings.edit_message} onClick={this._onClick}>
             {strings.edit_message}
           </a>;
  },

  _onClick() {
    MessageActions.initiateMessageEdit(this.props.msg);
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_actions/edit_message.js
 **/