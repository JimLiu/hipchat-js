import AppConfig from 'config/app_config';
import AppDispatcher from 'dispatchers/app_dispatcher';
import InlineDialog from 'components/common/inline_dialog/inline_dialog';
import strings from 'strings/connection_notification_strings';
import ConnectionStatusStore from 'stores/connection_status_store';
import ConfigStore from 'stores/configuration_store';
import ConnectionStates from 'lib/enum/connection';
import NetworkStates from 'lib/enum/network';

export default React.createClass({

  displayName: 'ConnectionStatusMessage',

  getInitialState() {
    return this._getState();
  },

  componentDidMount() {
    ConfigStore.on(["change:feature_flags"], this._onChange);
    ConnectionStatusStore.on(["change:connection_status","change:reconnectingIn"], this._onChange);
    AppDispatcher.register('position-app-header-dialogs', this._positionDialog);
    this._positionDialog();
  },

  componentWillUnmount() {
    ConfigStore.off(["change:feature_flags"], this._onChange);
    ConnectionStatusStore.off(["change:connection_status","change:reconnectingIn"], this._onChange);
    AppDispatcher.unregister('position-app-header-dialogs', this._positionDialog);
  },

  render() {
    let content = this._getContent();
    return (
      <InlineDialog dialogId="connectionStatusMessage">
        {content}
      </InlineDialog>
    );
  },

  _getContent() {
    switch (this.props.status) {

      case ConnectionStates.RECONNECT_DELAY:
        return (
          <div>
            <p>{ strings.check_network }</p>
          </div>
        );

      case ConnectionStates.DISCONNECTED:
        return (
          <div>
            {this.state.isBTF ? false : <p dangerouslySetInnerHTML={{__html: strings.unable_to_connect_hipchat(AppConfig.status_page_url)}} />}
          </div>
        );

      case NetworkStates.OFFLINE:
        return (
          <div>
            <p>{ strings.offline_status }</p>
          </div>
        );

      default:
        return <span />;
    }
  },

  _onChange () {
    this.setState(this._getState());
  },

  _getState () {
    let reconnectSeconds = Math.round(ConnectionStatusStore.get('reconnectingIn') / 1000);
    return {
      isBTF: _.get(ConfigStore.get('feature_flags'), 'btf', false),
      reconnectSeconds
    };
  },

  _positionDialog () {
    var anchor = this.props.anchor,
        node = ReactDOM.findDOMNode(this),
        top,
        left;

    if (anchor) {
      _.delay(function() {
        top = anchor.getBoundingClientRect().bottom + 5;
        left = anchor.getBoundingClientRect().right - $(node).width();
        $(node).css({
          top: top + "px",
          left: left + "px"
        });
      }, AppConfig.notification_banner_slide);
    }
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/connection_status_message.js
 **/