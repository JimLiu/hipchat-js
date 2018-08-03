import video_utils from 'helpers/video_utils';
import VideoActions from 'actions/video_actions';

export default React.createClass({

  displayName: "ChatWindowMessageWrapper",

  _onClick(evt) {
    let isLink = _.get(evt, 'target.tagName', '').toLowerCase() === 'a';
    let url = _.get(evt, 'target.href', null);
    let jid = this.props.msg.room;
    let room_id = this.props.chat_id;

    if (!this.props.is_guest && isLink && !!url && video_utils.isVideoLink(url)) {
      evt.preventDefault();
      VideoActions.joinRoomVideoCall({ url, jid, room_id });
    }
  },

  render() {
    let msgRef,
        msgClasses;

    if (this.props.messageStatus === 'failed') {
      msgRef = 'failed_message';
      msgClasses = 'msg-status msg-failed';
    } else if (this.props.messageStatus === 'flaky') {
      msgRef = 'flaky_message';
      msgClasses = 'msg-status msg-fail-container msg-flaky hc-msg-loading';
    } else if (this.props.messageStatus === 'unconfirmed') {
      msgRef = 'unconfirmed_message';
      if (this.props.honest_messages_enabled) {
        msgClasses = 'msg-status msg-unconfirmed';
      } else {
        msgClasses = 'msg-status msg-confirmed';
      }
    } else {
      msgRef = 'confirmed_message';
      if (this.props.msg.type === 'file') {
        msgClasses = 'msg-status msg-confirmed hc-msg-file';
      } else {
        msgClasses = 'msg-status msg-confirmed';
      }
    }

    return (
      <div ref={msgRef} onClick={this._onClick} className={msgClasses}>
        {this.props.innerMessage}
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_wrapper.js
 **/