import Roster from './roster';
import Files from './files';
import Spinner from 'components/common/spinner/spinner';
import Links from './links';
import Integrations from './integrations/integrations';
import RosterStore from 'stores/roster_store';
import PreferencesStore from "stores/preferences_store";
import PureRenderMixin from 'react-addons-pure-render-mixin';

function getPanelState() {
  let integrationsEnabled = RosterStore.get('web_client_integrations_enabled');
    return {
    groupchat_active_panel: PreferencesStore.getGroupChatActivePanel(),
    chat_active_panel: PreferencesStore.getChatActivePanel(),
    chat_type: RosterStore.get('chat_type'),
    loading: RosterStore.get('loading') && !integrationsEnabled,
    initialized: RosterStore.get('initialized'),
    web_client_integrations: integrationsEnabled,
    guest_url: RosterStore.get('guest_url'),
    active_chat: RosterStore.get('active_chat')
  };
}

export default React.createClass({

  displayName: "RightSideBar",

  mixins: [PureRenderMixin],

  getInitialState: function(){
    return getPanelState();
  },

  componentDidMount: function() {
    RosterStore.on('change', this._onChange);
    PreferencesStore.on(['change'], this._onChange);
  },

  componentWillUnmount: function(){
    RosterStore.off('change', this._onChange);
    PreferencesStore.off(['change'], this._onChange);
  },

  _getActivePanel: function () {
    var panel;
    if (this.state.chat_type === "chat") {
      switch(this.state.chat_active_panel) {
        case "files":
          panel = this._filesPanel();
          break;
        case "links":
          panel = this._linksPanel();
          break;
        case "integrations":
          if (this.state.web_client_integrations) {
            panel = this._integrationsPanel();
          }
          break;
      }
    } else if (this.state.chat_type === "groupchat") {
      switch(this.state.groupchat_active_panel) {
        case "roster":
          panel = this._rosterPanel();
          break;
        case "files":
          panel = this._filesPanel();
          break;
        case "links":
          panel = this._linksPanel();
          break;
        case "integrations":
          if (this.state.web_client_integrations) {
            panel = this._integrationsPanel();
          }
          break;
      }
    }
    return panel;
  },

  _rosterPanel: function () {
    return (
      <Roster is_guest={this.props.is_guest}/>
    );
  },

  _filesPanel: function () {
    return (
      <Files is_guest={this.props.is_guest}/>
    );
  },

  _linksPanel: function () {
    return (
      <Links is_guest={this.props.is_guest} />
    );
  },

  _integrationsPanel: function () {
    return (
      <Integrations/>
    );
  },

  _onChange: function() {
    this.setState(getPanelState());
  },

  _shouldHidePanelWhenLoading(){
    return this.state.chat_active_panel !== "files" &&
           this.state.chat_active_panel !== "links";
  },

  render: function(){
    var panel = (this.state.loading && this._shouldHidePanelWhenLoading()) ? "" : this._getActivePanel();
    return (
      <div className="hc-roster-container">
        <Spinner spin={this.state.loading && this.state.initialized} zIndex={1} />
        {panel}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/sidebar.js
 **/