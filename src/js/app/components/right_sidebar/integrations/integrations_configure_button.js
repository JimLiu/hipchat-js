import AppStore from 'stores/application_store';
import strings from 'strings/integrations_strings';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import DialogActions from 'actions/dialog_actions';
import AnalyticsActions from 'actions/analytics_actions';
import ChatHeaderStore from 'stores/chat_header_store';

export default React.createClass({

  displayName: 'IntegrationsConfigureButton',

  mixins: [PureRenderMixin],

  getInitialState: function () {
    return this._getState();
  },

  componentDidMount: function() {
    AppStore.on(['change:web_server', 'change:current_user'], this._onChange);
  },

  componentWillUnmount: function() {
    AppStore.off(['change:web_server', 'change:current_user'], this._onChange);
  },

  _getState: function () {
    var current_user = AppStore.get("current_user");

    return {
      user_id: current_user.user_id,
      web_server: AppStore.get("web_server")
    };
  },

  _onChange: function() {
    this.setState(this._getState());
  },

  _onIntegrationsClick: function() {
    var chat = ChatHeaderStore.get('chat');
    DialogActions.showIntegrationsManagementDialog({
      jid: chat.jid,
      room_name: chat.name
    });
    AnalyticsActions.roomIntegrationsLinkClicked();
  },

  render() {
    return (
      <div className="hc-integration-sidebar-footer hc-integrations-configure-button">
        <div>
          <a id="hc-integrations-link" onClick={this._onIntegrationsClick} target="_blank" className="aui-nav-item">
            <span className="aui-icon aui-icon-small aui-iconfont-configure "/>
            <span>{strings.configure_integrations}</span>
          </a>
        </div>
      </div>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/integrations/integrations_configure_button.js
 **/