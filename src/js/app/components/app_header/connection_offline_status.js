import InlineDialogActions from 'actions/inline_dialog_actions';
import strings from 'strings/connection_notification_strings';

export default React.createClass({

  displayName: "ConnectionOfflineStatus",

  _showInlineDialog() {
    InlineDialogActions.showConnectionStatusMessage({
      anchor: this.refs.banner,
      status: this.props.status
    });
  },

  _hideInlineDialog() {
    InlineDialogActions.hideInlineDialog();
  },

  render () {
    return (
      <div ref="banner" className="hc-header-connection disconnected aui-inline-dialog-trigger" onMouseEnter={this._showInlineDialog} onClick={this._hideInlineDialog}>
        <span className="connection-status-icon">
          <span className="aui-icon aui-icon-small aui-iconfont-warning" />
        </span>
        <span className="connection-status">{ strings.offline }</span>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/connection_offline_status.js
 **/