import InlineDialogActions from 'actions/inline_dialog_actions';
import strings from 'strings/connection_notification_strings';
import ConnectionActions from 'actions/connection_actions';
import AnalyticsActions from 'actions/analytics_actions';

export default React.createClass({

  displayName: "ConnectionCountdownStatus",

  propTypes: {
    seconds: React.PropTypes.number,
    minutes: React.PropTypes.number
  },

  getDefaultProps() {
    return {
      seconds: 0,
      minutes: 0
    };
  },

  _handleMouseEnter() {
    InlineDialogActions.showConnectionStatusMessage({
      anchor: this.refs.banner,
      status: this.props.status
    });
  },

  _handleReconnectClick() {
    ConnectionActions.handleReconnectLinkClick();
    InlineDialogActions.hideInlineDialog();
    AnalyticsActions.tryToReconnectFromHeader();
  },

  _hideInlineDialog() {
    InlineDialogActions.hideInlineDialog();
  },

  /* Get correct countdown message
   * - seconds singular or plural
   */
  _getCountdownMessage() {
    return strings.connecting_seconds(this.props.seconds);
  },

  render () {
    let message = this._getCountdownMessage();
    return (
      <div ref="banner" className="hc-header-connection countdown aui-inline-dialog-trigger" onMouseEnter={this._handleMouseEnter} onClick={this._hideInlineDialog}>
        {message}
        <a className="reconnect-now" onClick={this._handleReconnectClick}>{strings.retry_cta}</a>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/connection_countdown_status.js
 **/