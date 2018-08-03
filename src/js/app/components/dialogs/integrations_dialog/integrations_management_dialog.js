import ModalDialog from 'components/common/modal_dialog/modal_dialog';
import IntegrationsStore from 'stores/integrations_store';
import PermissionsStore from 'stores/permissions_store';
import CurrentUserStore from 'stores/current_user_store';
import ConfigStore from 'stores/configuration_store';
import IntegrationHelper from 'helpers/integration_helper';
import EmptyState from './integrations_management_dialog_empty_state';
import strings from 'strings/integrations_strings';
import IntegrationsSection from "./integrations_section";

const BITBUCKET_ADDON_KEY = 'com.atlassian.bitbucket.hipbucket';

let integration_events = [
  'change:integrations',
  'change:unsupported_integrations',
  'change:active_chat',
  'change:pending_updates'
];

export default React.createClass({

  displayName: 'IntegrationsDialog',

  getInitialState() {
    return this._getState();
  },

  componentDidMount() {
    IntegrationsStore.on(integration_events, this._onChange);
    CurrentUserStore.on('change:id', this._onChange);
    ConfigStore.on('change:web_server', this._onChange);
  },

  componentWillUnmount() {
    IntegrationsStore.off(integration_events, this._onChange);
    CurrentUserStore.off('change:id', this._onChange);
    ConfigStore.off('change:web_server', this._onChange);
  },

  _onChange() {
    this.setState(this._getState());
  },

  _getState() {
    let {pending_global, pending_room, disabled, installed} = IntegrationsStore.getIntegrationStatusesForContext();

    return {
      active_chat: IntegrationsStore.get('active_chat'),
      pending_global: pending_global,
      pending_room: pending_room,
      disabled: disabled,
      installed: installed,
      integrations: IntegrationsStore.getUniqueIntegrationsForContext(),
      web_server: ConfigStore.get('web_server'),
      current_user_id: CurrentUserStore.get('id')
    };
  },

  _getConfigButton(integration) {
    let url = IntegrationHelper.getIntegrationsConfigUrl(this.state.web_server, this.state.active_chat.id, integration.addon_key);
    return <a href={url} target="_blank" className="hc-integration-configure">
      <span className="aui-icon aui-icon-small aui-iconfont-configure" aria-label={strings.configure_integration}/>
    </a>;
  },

  _getUpdateButton(integration) {
    let global_context = integration.context === "global";
    let chat_id = global_context ? -1 : this.state.active_chat.id;

    let url = IntegrationHelper.getIntegrationsUpdateUrl(this.state.web_server, chat_id, integration.addon_key);
    return <a href={url} target="_blank" className="hc-integration-update">
      {strings.update}
    </a>;
  },

  _getDisabledIntegrationsSection(integrations) {
    return <IntegrationsSection title={strings.disabled_integrations}
                                section="unsupported"
                                description={strings.the_following_integrations_require_the_latest_version_of_hipchat}
                                integrations={integrations}
                                showGlobalLozenge={false}/>;
  },

  _getInstalledIntegrationsSection(integrations) {
    let actions = _.noop;

    if (PermissionsStore.canUpdateRoomIntegrations()) {
      actions = this._getConfigButton;
    }

    return <IntegrationsSection title={strings.active}
                                status={strings.installed_count(integrations.length)}
                                section="installed"
                                integrations={integrations}
                                actions={actions}
                                showGlobalLozenge={true}/>;
  },

  _getPendingRoomUpdatesSection(integrations) {
    let actions = _.noop;

    if (PermissionsStore.canUpdateRoomIntegrations()) {
      actions = this._getUpdateButton;
    }

    return <IntegrationsSection title={strings.pending_updates}
                                status={strings.pending_updates_count(integrations.length)}
                                section="pending-room"
                                description={PermissionsStore.canUpdateRoomIntegrations() ? null : strings.pending_updates_contact_admin}
                                integrations={integrations}
                                actions={actions}
                                showGlobalLozenge={false}/>;
  },

  _getPendingGlobalUpdatesSection(integrations) {
    let actions = _.noop;

    if (PermissionsStore.get('user_is_admin')) {
      actions = this._getUpdateButton;
    }

    return <IntegrationsSection title={strings.pending_global_updates}
                                status={strings.pending_updates_count(integrations.length)}
                                section="pending-global"
                                description={PermissionsStore.get('user_is_admin') ? null : strings.pending_global_updates_contact_admin}
                                integrations={integrations}
                                actions={actions}
                                showGlobalLozenge={false}/>;
  },

  _getInstallNewIntegrationsSection() {
    if (!PermissionsStore.canManageRoomIntegrations()) {
      return null;
    }

    let url = IntegrationHelper.getIntegrationsUrl(this.state.web_server, this.state.active_chat.id, this.state.current_user_id, IntegrationHelper.DIALOG_LINK_SOURCE_ID);

    return (
      <div className="hc-integration-section">
        <a href={url} target="_blank" className="hc-install-link">
          <span className="aui-icon aui-icon-small aui-iconfont-add-small" />
          <span>{strings.install_new_integrations}</span>
        </a>
      </div>
    );
  },

  _isBitbucketInstalledButNotConfigured(integrations) {
    let is_bitbucket_configured = () => _.find(IntegrationsStore.getExtensionsByType('glance'), addon => addon.addon_key === BITBUCKET_ADDON_KEY);
    let is_bitbucket_disabled = () => _.find(this.state.disabled, (addon) => addon.addon_key === BITBUCKET_ADDON_KEY);

    return integrations.length === 1                        // Only one addon installed
      && integrations[0].addon_key === BITBUCKET_ADDON_KEY  // Addon is bitbucket
      && !is_bitbucket_disabled()                           // Addon isn't disabled
      && !is_bitbucket_configured();                        // Addon isn't configured (no glance)
  },

  _shouldShowEmptyState() {
    let integrations = this.state.integrations;

    if (integrations.length === 0) {
      return true;
    }

    return this._isBitbucketInstalledButNotConfigured(integrations);
  },

  _getDialogBody() {
    if (this._shouldShowEmptyState()) {
      let can_manage_integrations = PermissionsStore.canManageRoomIntegrations();
      return (<EmptyState active_chat_id={this.state.active_chat.id}
                          user_id={this.state.current_user_id}
                          web_server={this.state.web_server}
                          can_manage_integrations={can_manage_integrations} />);
    }

    return (
      <div>
        {this._getInstallNewIntegrationsSection()}
        {this._getPendingRoomUpdatesSection(this.state.pending_room)}
        {this._getPendingGlobalUpdatesSection(this.state.pending_global)}
        {this._getDisabledIntegrationsSection(this.state.disabled)}
        {this._getInstalledIntegrationsSection(this.state.installed)}
      </div>
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="integrations-management-dialog"
                   title="Integrations"
                   size="medium"
                   dialogBody={this._getDialogBody}
                   showFooter={false}
                   noCloseLink={true} />
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/integrations_dialog/integrations_management_dialog.js
 **/