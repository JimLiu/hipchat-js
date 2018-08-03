import InlineDialogActions from 'actions/inline_dialog_actions';
import strings from 'strings/connection_notification_strings';
import ConnectionActions from 'actions/connection_actions';
import AnalyticsActions from 'actions/analytics_actions';

export default React.createClass({

  displayName: "ConnectionCannotConnectStatus",

  _handleMouseEnter() {
    InlineDialogActions.showConnectionStatusMessage({
      anchor: this.refs.banner,
      status: this.props.status
    });
  },

  _handleCantConnectLinkClick() {
    ConnectionActions.reconnect();
    InlineDialogActions.hideInlineDialog();
    AnalyticsActions.tryToReconnectFromHeader();
  },

  _hideInlineDialog() {
    InlineDialogActions.hideInlineDialog();
  },

  render () {
    return (
      <div ref="banner" className="hc-header-connection disconnected aui-inline-dialog-trigger" onMouseEnter={this._handleMouseEnter} onClick={this._hideInlineDialog}>
        <span className="connection-status-icon">
          <span className="aui-icon aui-icon-small aui-iconfont-warning" />
        </span>
        <span className="connection-status">{ strings.cant_connect }</span>
        <a className="reconnect-now" onClick={this._handleCantConnectLinkClick}>{strings.retry_cta}</a>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/connection_cannot_connect_status.js
 **/