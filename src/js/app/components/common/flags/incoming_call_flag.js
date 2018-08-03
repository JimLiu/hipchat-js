import AppConfig from 'config/app_config';
import VideoCallStrings from 'strings/video_call_strings';
import IncomingCallActions from 'actions/incoming_call_actions';
import PersonAvatar from 'components/common/avatars/person_avatar';

export default React.createClass({

  displayName: 'IncomingCallFlag',

  componentDidMount() {
    this.closing = false;
    this.missed_call_timeout = setTimeout(() => {
      this._close();
    }, AppConfig.missed_video_call_timeout - AppConfig.flag_close_animation_time);
  },

  componentWillUnmount() {
    clearTimeout(this.missed_call_timeout);
    this.missed_call_timeout = null;
  },

  _onAnswer() {
    if (this.closing) {
      return;
    }
    IncomingCallActions.answerCall(this.props.message, this.props.service);
    this._close();
   },

  _onIgnore() {
    if (this.closing) {
      return;
    }
    IncomingCallActions.declineCall(this.props.message, this.props.service);
    this._close();
  },

  _close() {
    this.closing = true;
    clearTimeout(this.missed_call_timeout);
    if (this.isMounted()){
      ReactDOM.findDOMNode(this).setAttribute('aria-hidden', true);
    }
  },

  render() {
    return (
      <div className='hc-flag' data-flag-index={this.props.flag_index} aria-hidden='false'>
        <div className='hc-message hc-message-video info'>
          <h6>Incoming call</h6>
          <div className='sender-container'>
            <PersonAvatar avatar_url={this.props.photo} size='large' show_presence={false}/>
            <h3 className='sender'>{this.props.sender}</h3>
          </div>
          <button
            ref='answer'
            className='aui-button aui-button-primary'
            onClick={this._onAnswer}>
              {VideoCallStrings.answer}
          </button>
          <button
            ref='ignore'
            className='aui-button'
            onClick={this._onIgnore}>
              {VideoCallStrings.ignore}
          </button>
        </div>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/flags/incoming_call_flag.js
 **/