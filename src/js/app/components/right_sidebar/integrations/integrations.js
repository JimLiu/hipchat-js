import IntegrationsStore from 'stores/integrations_store';
import PermissionsStore from 'stores/permissions_store';
import PreferencesStore from 'stores/preferences_store';
import PreferencesKeys from 'keys/preferences_keys';
import GlancesMetadataStore from 'stores/glances_metadata_store';
import GlanceActions from 'actions/glance_actions';
import Glance from './glance';
import AddIntegrationsGlance from './add_integrations_glance';
import IntegrationView from './integration_view';
import IntegrationsActions from 'actions/integrations_actions';
import ClientPreferencesKeys from 'keys/client_preferences_keys';
import IntegrationsConfigureButton from './integrations_configure_button';
import Spinner from 'components/common/spinner/spinner';
import cx from 'classnames';
import logger from 'helpers/logger';
import RosterStore from 'stores/roster_store';
import People from '../roster';
import RosterMini from '../roster_mini';
import Files from '../files';
import Links from '../links';
import AppConfig from 'config/app_config';
import ApplicationStore from 'stores/application_store';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import ConfigStore from "stores/configuration_store";

var internalModules = {
    people: function() { return <People is_guest={ApplicationStore.get("current_user").is_guest}/>; },
    files: function() { return <Files/>; },
    links: function() { return <Links/>; }
};

const GLANCE_VISIBLE_THRESHOLD = 3;

export default React.createClass({

  displayName: "RightSideBarIntegrations",

  mixins: [PureRenderMixin],

  getInitialState: function() {
    return this._getState();
  },

  componentDidMount: function() {
    IntegrationsStore.on(['change:integrations', 'change:active_chat', 'change:loading', 'change:error'], this._onChange);
    PreferencesStore.on([`change:${ClientPreferencesKeys.ACTIVE_CHAT_INTEGRATION}`, `change:${ClientPreferencesKeys.ACTIVE_GROUPCHAT_INTEGRATION}`], this._onChange);
    GlancesMetadataStore.on(['change:dynamic_glances', 'change:visible_glances'], this._onChange);
    RosterStore.on('change:loading', this._onChange);
    IntegrationsStore.on(['change:state'], this._onConnectionChange);
    PreferencesStore.on([`change:${PreferencesKeys.IGNORE_ADD_INTEGRATIONS_GLANCE}`], this._onChange);
  },

  componentWillMount: function() {
    this._fetchGlanceData();
  },

  componentWillUnmount: function() {
    IntegrationsStore.off(['change:integrations', 'change:active_chat', 'change:loading', 'change:error'], this._onChange);
    PreferencesStore.off([`change:${ClientPreferencesKeys.ACTIVE_CHAT_INTEGRATION}`, `change:${ClientPreferencesKeys.ACTIVE_GROUPCHAT_INTEGRATION}`], this._onChange);
    GlancesMetadataStore.off(['change:dynamic_glances', 'change:visible_glances'], this._onChange);
    RosterStore.off('change:loading', this._onChange);
    IntegrationsStore.off(['change:state'], this._onConnectionChange);
    PreferencesStore.off([`change:${PreferencesKeys.IGNORE_ADD_INTEGRATIONS_GLANCE}`], this._onChange);
  },

  _fetchGlanceData: function() {
    let current_glances = GlancesMetadataStore.get('dynamic_glances');
    let active_chat = IntegrationsStore.get('active_chat');

    if(active_chat && _.has(active_chat, "id")) { // Active chat can be null. For example if you're in the lobby and hit refresh.
      current_glances.forEach(g => {
          let room_glance = IntegrationsStore.getExtensionByKey(g.full_key);
          let isInRoom = !_.isEmpty(room_glance);
          if(isInRoom && GlancesMetadataStore.shouldFetch(active_chat.id, g.full_key)) {
            GlanceActions.fetchGlanceMetadata(active_chat.id, g);
          }
        }
      );
    }
  },

  _onChange: function() {
    this.setState(this._getState());
    this._fetchGlanceData();
  },

  _onConnectionChange: function(newValue) {

    if(newValue === IntegrationsStore.states.STARTED) {
        this._onChange();
    }
  },

  _getState: function() {
    var activeChat = IntegrationsStore.get('active_chat');
    var glances = GlancesMetadataStore.get('visible_glances');
    var dynamic_glances = GlancesMetadataStore.get('dynamic_glances');
    var feature_flags = ConfigStore.get('feature_flags');

    var chatType = RosterStore.get('chat_type');
    var isGroupChat = (chatType === 'groupchat') && activeChat && activeChat.id;

    return {
      roomId: isGroupChat ? activeChat.id : undefined,
      glances: isGroupChat ? glances : [],
      dynamic_glances: isGroupChat ? dynamic_glances : [],
      internal_glances: this._getInternalGlances(chatType),
      active_integration: IntegrationsStore.getActiveIntegration(chatType),
      loading: IntegrationsStore.get('loading'),
      error: IntegrationsStore.get('error'),
      chat_type: chatType,
      loading_internal: RosterStore.get('loading'),
      show_integrations_glance: this._setShowAddIntegrationsGlance(activeChat, glances.length, feature_flags)
    };
  },

  _renderSummaryView(glance) {
    if (glance.full_key === AppConfig.people_glance.full_key) {
        return (<RosterMini max_items_to_render={AppConfig.people_glance.max_items_to_render_collapsed}/>);
    }
    return false;
  },

  _getGlanceBody: function(glance) {
    if (!glance) {
      return false;
    }

    var key = `${glance.full_key}`;
    return (
      <li key={key}>
        <Glance glance={glance} room_id={this.state.roomId}>
          {this._renderSummaryView(glance)}
        </Glance>
      </li>
    );
  },

  _getRenderedGlances: function() {
    let glances = _.union(this.state.internal_glances, this.state.glances);
    return _.map(glances, this._getGlanceBody);
  },

  _glancesBody: function(renderedGlances) {
    var addIntegrationsGlance;
    if (this.state.show_integrations_glance) {
      addIntegrationsGlance = (
        <li>
          <AddIntegrationsGlance room_id={this.state.roomId}/>
        </li>
      );
    }

      return (
      <ul className="aui-nav aui-navgroup-vertical hc-glances" data-skate-ignore>
        {renderedGlances}
        {addIntegrationsGlance}
      </ul>
    );
  },


  _setShowAddIntegrationsGlance: function (activeRoomObject, numberOfGlances, featureFlags) {
    if (!activeRoomObject) {
      return;
    }

    var shouldShowIntegrationsGlance = false;
    if (activeRoomObject.type === 'groupchat') {
      var ignoredRooms = PreferencesStore.getIgnoreAddIntegrationGlanceRooms();

      if (activeRoomObject.id && !_.includes(ignoredRooms, parseInt(activeRoomObject.id))) {
        if (this._shouldShowIntegrationsDiscoveryGlance(numberOfGlances, featureFlags)) {
          shouldShowIntegrationsGlance = true;
        }
      }
    }
    return shouldShowIntegrationsGlance;
  },

  _shouldShowIntegrationsDiscoveryGlance: function(numberOfGlances, featureFlags) {
    return _.get(featureFlags, "web_client_enable_integration_discovery_glance")
      && PermissionsStore.canManageRoomIntegrations()
      && numberOfGlances < GLANCE_VISIBLE_THRESHOLD;
  },

  _getIntegrationsConfigureButton: function() {
    if (this.state.chat_type === 'chat' || !PermissionsStore.canManageRoomIntegrations()) {
      return null;
    }
    return (<IntegrationsConfigureButton room_id={this.state.roomId} />);
  },

  _renderGlanceList: function() {
    var rendered_glances = this._getRenderedGlances(),
        glances_display = !_.isEmpty(rendered_glances) ? this._glancesBody(rendered_glances) : null,
        classNames = cx({
          'hc-integrations-wrap': true,
          'hc-can-manage-integrations': PermissionsStore.canManageRoomIntegrations()
        });

    return (
      <div className={classNames}>
        {glances_display}
      </div>
    );
  },

  _hideIntegrationView: function() {
    IntegrationsActions.closeSidebarView("sidebar");
  },

  _renderIntegrationView: function(integration, activeIntegrationKey) {

    if (_.isNull(integration) || _.isUndefined(integration)) {
      logger.warn('[HC-Integrations]', `Unknown integration view ${activeIntegrationKey}.`);
      return null;
    }

    if (integration.internal) {
      return this._renderInternalIntegrationView(integration);
    }

    var key = `${this.state.roomId}:${integration.full_key}`;
    var glance = IntegrationsStore.getExtensionByKey(_.get(this.state.active_integration, "glance_key"));

    return (
      <IntegrationView integration={integration}
                       room_id={this.state.roomId}
                       url_template_values={this.state.active_integration.url_template_values}
                       init_event={this.state.active_integration.init_event}
                       hideIntegrationView={this._hideIntegrationView}
                       glance={glance}
                       key={key}/>
    );
  },

  _renderInternalIntegrationView: function(integration) {

    var internalModule = internalModules[integration.key];

    return (
      <IntegrationView integration={integration}
                       room_id={this.state.roomId}
                       hideIntegrationView={this._hideIntegrationView}
                       key={integration.key}
                       glance={integration}
                       loading={this.state.loading_internal}>
        { internalModule() }
      </IntegrationView>);
  },

  /**
   * HipChat provides default integrations such as files, links and people
   *
   * All of our internal integration are marked with internal : true
   * The key is mapped to the internalModules array in integrations.js
   */
  _getInternalGlances(chatType) {
    let type = chatType || this.state.chat_type;
    if (_.isEqual(this.props.internal, "false")) {
      return [];
    }

    if(type === 'chat') {
      return IntegrationsStore.getInternalExtensionsOTO();
    }

    return IntegrationsStore.getInternalExtensions();
  },

  _getIntegration: function (activeIntegrationKey) {
    var extension = IntegrationsStore.getExtensionByKey(activeIntegrationKey);
    return extension || _.find(this._getInternalGlances(), integration => integration.full_key === activeIntegrationKey);
  },

  render: function() {

    var integrationClasses,
        integrations_display,
        activeIntegrationKey = _.get(this.state.active_integration, "key", null),
        integration = this._getIntegration(activeIntegrationKey),
        activeIntegrationExists = !_.isUndefined(integration) && !_.isNull(integration),
        hasActiveIntegration = !(_.isNull(activeIntegrationKey) || !activeIntegrationExists),
        configureButton = hasActiveIntegration ? null : this._getIntegrationsConfigureButton();

    if (!hasActiveIntegration) {
      integrations_display = this._renderGlanceList();
      integrationClasses = cx({'hc-integrations': true});
    } else {
      integrations_display = this._renderIntegrationView(integration, activeIntegrationKey);
      integrationClasses = cx({'hc-integrations': true, 'glance-selected': true});
    }

    return (
      <div className={integrationClasses}>
        <Spinner spin={this.state.loading} zIndex={1} />
        {integrations_display}
        {configureButton}
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/integrations/integrations.js
 **/