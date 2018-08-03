import OfflineStatus from 'components/app_header/connection_offline_status';
import CannotConnectStatus from 'components/app_header/connection_cannot_connect_status';
import CountdownStatus from 'components/app_header/connection_countdown_status';
import ConnectionStatusStore from 'stores/connection_status_store';
import InlineDialogActions from 'actions/inline_dialog_actions';
import Spinner from 'components/common/spinner/spinner';
import strings from 'strings/connection_notification_strings';
import ConnectionStates from 'lib/enum/connection';
import NetworkStates from 'lib/enum/network';
import AnalyticsActions from 'actions/analytics_actions';

export default React.createClass({

  displayName: "ConnectionStatus",

  getInitialState() {
    return this._getState();
  },

  componentDidMount() {
    ConnectionStatusStore.on('change', this._onChange);
  },

  componentWillUnmount() {
    ConnectionStatusStore.off('change', this._onChange);
  },

  componentWillUpdate(nextProps, nextState) {
    /*
     * Connection inline dialog should be hidden
     * if the status changes.
     */
    if (this.state.status !== nextState.status ||
        this.state.network_status !== nextState.network_status) {
      InlineDialogActions.hideInlineDialog();
    }
  },

  shouldComponentUpdate(nextProps, nextState) {
    /*
     * Should only re-render if:
     * - the status changes (ex: connected -> reconnecting)
     * - the network status changes (ex: online -> offline)
     * - the countdown banner is showing (allows time changes to render)
     * - secondsToRetry is counting down from 1 to 0
     *
     * This logic prevents the connecting spinner from jumping due
     * to re-renders.
     */

    return this.state.status !== nextState.status ||
           this.state.network_status !== nextState.network_status ||
           this.state.status === ConnectionStates.RECONNECT_DELAY ||
           this.state.secondsToRetry === 1 && nextState.secondsToRetry === 0;
  },

  render() {
    if (this.state.network_status === NetworkStates.OFFLINE) {
      AnalyticsActions.connectionUIStateOffline();
      return <OfflineStatus status={this.state.network_status} />;
    }

    switch (this.state.status) {
      case ConnectionStates.RECONNECTING:
        AnalyticsActions.connectionUIStateConnecting();
        return this._getReconnectingBanner();

      case ConnectionStates.RECONNECT_DELAY:
        AnalyticsActions.connectionUIStateConnectDelay();
        return this._getDelayBanner();

      case ConnectionStates.DISCONNECTED:
        AnalyticsActions.connectionUIStateCannotConnect();
        return <CannotConnectStatus status={this.state.status} />;

      default:
        return <span />;
    }
  },

  _getReconnectingBanner() {
    let banner = <span />;
    banner = (
      <div className="hc-header-connection reconnecting">
        <span className="connection-status-icon">
          <Spinner spin={true} spinner_class="connection-spinner" size="small" color="white" left="-16px" top="-8px" />
        </span>
        <span className="connection-status">{strings.connecting}</span>
      </div>
    );
    return banner;
  },

  _getDelayBanner() {
    let banner = <span />;
    banner = <CountdownStatus seconds={this.state.secondsToRetry} status={this.state.status}/>;
    return banner;
  },

  _getState() {
    let connectionState = ConnectionStatusStore.getAll(),
        msToRetry = connectionState.reconnectingIn,
        secondsToRetry = Math.round(msToRetry / 1000);

    /*
     * The page fires the unloading event, THEN strophe fires a disconnected event -- but we
     * don't want the red "disconnected" banner to show after you hit the refresh button, so
     * unsubscribe from the ConnectionStatusStore when we get the UNLOADING status
     */
    if (connectionState.connection_status === ConnectionStates.UNLOADING) {
      ConnectionStatusStore.off('change', this._onChange);
    }

    return {
      status: connectionState.connection_status,
      network_status: connectionState.network_status,
      msToRetry: msToRetry,
      secondsToRetry: secondsToRetry
    };
  },

  _onChange() {
    this.setState(this._getState());
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/connection_status.js
 **/