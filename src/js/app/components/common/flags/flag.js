import FlagActions from 'actions/flag_actions';
import AppConfig from 'config/app_config';
import cx from 'classnames';

export default React.createClass({

  displayName: 'Flag',

  propTypes: {
    type: React.PropTypes.oneOf(['info', 'success', 'warning', 'error']).isRequired,
    close: React.PropTypes.oneOf(['manual', 'auto', 'never']).isRequired
  },

  _isCloseable() {
    return (this.props.close !== 'never');
  },

  _getCloseButton() {
    return this._isCloseable() ? <span onClick={this.close} className='aui-icon hipchat-icon-small icon-close' role='button' tabIndex='0'></span> : undefined;
  },

  _getImage() {
    if (!this.props.image_url) {
      return null;
    }
    return <p className='image'><img src={this.props.image_url} /></p>;
  },

  _getAction() {
    if (!this.props.link_url || !this.props.link_text) {
      return null;
    }
    return (
      <ul className="aui-nav-actions-list">
        <li><a href={this.props.link_url} target='_blank'>{this.props.link_text}</a></li>
      </ul>
    );
  },

  close() {
    var flag_index = this.props.flag_index;
    if (this.isMounted()){
      $(ReactDOM.findDOMNode(this)).attr('aria-hidden', true);
    }
    if (typeof this.props.onClose === 'function'){
      this.props.onClose();
    }
    _.delay(function () {
      // Wait for animation to complete before removing flag
      FlagActions.removeFlag(flag_index);
    }, AppConfig.flag_close_animation_time);
  },

  render() {
    var classes = cx({
      'hc-message': true,
      ['hc-message-' + this.props.type]: true,
      [this.props.type]: true,
      'closeable': this._isCloseable()
    });

    if (this.props.close === 'auto') {
      _.delay(this.close, this.props.delay || 2000);
    }

    return (
      <div className='hc-flag' data-flag-index={this.props.flag_index} aria-hidden='false'>
        <div className={classes}>
          {this._getImage()}
          <p className='title'><strong>{this.props.title}</strong></p>
          {typeof this.props.body === 'function' ? this.props.body() : this.props.body}
          {this._getAction()}
          {this._getCloseButton()}
        </div>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/flags/flag.js
 **/