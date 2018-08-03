import FlagActions from 'actions/flag_actions';
import AppConfig from 'config/app_config';
import strings from 'strings/dialog_strings';

export default React.createClass({

  displayName: 'Flag',

  propTypes: {
    close: React.PropTypes.oneOf(['manual', 'auto', 'never']).isRequired,
    promise: React.PropTypes.func.isRequired
  },

  _getCloseButton() {
    return <span onClick={this.close} className='aui-icon hipchat-icon-small icon-close' role='button' tabIndex='0'></span>;
  },

  close() {
    var flag_index = this.props.flag_index;
    if (this.isMounted()){
      $(ReactDOM.findDOMNode(this)).attr('aria-hidden', true);
    }
    _.delay(function () {
      // Wait for animation to complete before removing flag
      FlagActions.removeFlag(flag_index);
    }, AppConfig.flag_close_animation_time);
  },

  _executePromise() {
    this.props.promise().then(video_window => {
      if (video_window) {
        this.close();
      }
    });
  },

  render() {
    var classes = `hc-message hc-message-${this.props.type} hc-message-info closeable`;
    var closeBtn = this._getCloseButton();
    if (this.props.close === 'auto') {
      _.delay(this.close, 2000);
    }

    return (
      <div className='hc-flag' data-flag-index={this.props.flag_index} aria-hidden='false'>
        <div className={classes}>
          {typeof this.props.body === 'function' ? this.props.body() : this.props.body}
          {closeBtn}
          <br />
          <a onClick={this._executePromise} >{strings.try_again}</a>
        </div>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/flags/video_popup_blocked_flag.js
 **/