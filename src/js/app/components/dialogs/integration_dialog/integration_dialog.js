import ModalDialog from 'components/common/modal_dialog/modal_dialog';
import IntegrationFrame from 'components/common/integration/integration_frame';
import IntegrationsViewStore from 'stores/integrations_view_store';
import IntegrationDialogStore from 'stores/integration_dialog_store';
import IntegrationDialogActions from 'actions/integration_dialog_actions';
import PreferencesStore from 'stores/preferences_store';
import AppConfig from 'config/app_config';
import utils from 'helpers/utils';
import logger from 'helpers/logger';
import strings from 'strings/dialog_strings';
import Spinner from 'components/common/spinner/spinner';
import IntegrationActions from 'actions/integrations_view_actions';
import integration_strings from 'strings/integrations_strings';

module.exports = React.createClass({

  displayName: "IntegrationDialog",

  propTypes: {
    integration: React.PropTypes.shape({
      full_key: React.PropTypes.string.isRequired
    }).isRequired,
    room_id: React.PropTypes.string.isRequired,
    init_event: React.PropTypes.object
  },

  componentWillMount: function () {
    this.filterChange = _.debounce(IntegrationDialogActions.filterChange, AppConfig.dialog.filter_debounce_wait);
  },

  componentDidMount: function () {
    IntegrationDialogStore.on('change', this._onChange);
    IntegrationsViewStore.onIntegrationViewStatusChange(this.props.room_id, this.props.integration.full_key, this._onChange);
    PreferencesStore.on('change:theme', this._onChange);
  },

  componentWillUnmount: function () {
    IntegrationDialogStore.off('change', this._onChange);
    IntegrationsViewStore.offIntegrationViewStatusChange(this.props.room_id, this.props.integration.full_key, this._onChange);
    PreferencesStore.off('change:theme', this._onChange);
  },

  getInitialState: function () {
    return _.merge({
      view: {
        signed_url_loading: true
      }
    }, this._getState());
  },

  _onChange: function () {
    this.setState(this._getState());
  },

  _getState: function () {
    return {
      dialog: IntegrationDialogStore.getAll(),
      view: IntegrationsViewStore.getIntegrationViewStatus(this.props.room_id, this.props.integration.full_key) || {},
      theme: PreferencesStore.get('theme')
    };
  },

  _renderErrorFrame: function () {
    if (!this.state.view.error) {
      return null;
    }

    return <div className="hc-integrations-error">
      <div className="hc-integrations-error-image"/>
      <p>{integration_strings.integration_failed_to_load}</p>
      <button onClick={this._retryLoadingPanel} className="aui-button aui-button-primary">
        {integration_strings.retry}
      </button>
    </div>;
  },

  _renderIntegrationFrame: function () {
    if (!this._canRender()) {
      return null;
    }

    let signed_url = utils.appendQueryParameter(this.state.view.signed_url, "theme", this.state.theme);

    return (
      <IntegrationFrame integration={this.state.dialog}
                        signed_url={signed_url}
                        room_id={this.props.room_id}
                        init_event={this.props.init_event}/>
    );
  },

  _dialogBody: function () {
    let loading = false;
    let containerStyle = "hc-integration-view-dialog";
    if (!this.props.integration.internal) {
      loading = this.state.view.signed_url_loading || (this.state.view.signed_url && this.state.view.frame_loading !== false);
      containerStyle += " hc-integration-view-dialog-loading";
    }

    return (
      <div className={containerStyle}>
        <Spinner spin={loading}/>
        {this._renderIntegrationFrame()}
        {this._renderErrorFrame()}
      </div>
    );
  },

  _dialogFilterPlaceholder: function () {
    let filter = this.state.dialog.options.filter;
    return filter ? filter.placeholder : "";
  },

  _dialogFooterButton: function () {
    let primaryAction = this.state.dialog.options.primaryAction;
    if (primaryAction) {
      return this._renderButton(primaryAction, "aui-button-primary");
    }
  },

  _dialogFooterLinks: function () {
    let secondaryActions = this.state.dialog.options.secondaryActions;
    if (secondaryActions) {
      return _.map(secondaryActions, (action, index) => {
        let key = `${this.props.integration.full_key}:${index}`;
        return this._renderButton(action, "aui-button-link", key);
      });
    }
    return this._renderButton({enabled: true, name: strings.close}, "aui-button-link");
  },

  _renderButton: function (action, style, key) {
    let disabled = !_.get(action, "enabled", true);
    return (
      <button aria-disabled={disabled} disabled={disabled} className={"aui-button " + style} key={key}
              onClick={this._onButtonClick} data-action-key={action.key}>{action.name}</button>
    );
  },

  _isWarning: function () {
    return this.state.dialog.options.style === "warning";
  },

  _auiDialogSize: function () {
    let size = this.state.dialog.options.size;
    if (_.isString(size)) {
      return size;
    }
    return "medium";
  },

  _customDialogWidth: function() {
    return this._customDialogDimension('width', $(window).width());
  },

  _customDialogHeight: function() {
    return this._customDialogDimension('height', $(window).height() - AppConfig.dialog.max_size_margin);
  },

  _customDialogDimension: function(dim, maxAllowed) {
    let rawValue = _.get(this.state.dialog.options, ['size', dim]);
    if (rawValue) {
      let value = utils.strings.splitUnit(rawValue);
      if (value) {
        switch (value.unit) {
          case '%': return `${Math.min(100, value.num)}%`;
          case 'px': return `${Math.min(maxAllowed, value.num)}px`;
          default: logger.error('[HC-Integrations]', `Unsupported unit: ${value.unit}`);
        }
      } else {
        logger.error('[HC-Integrations]', `Unsupported  format: ${rawValue}`);
      }
    }
  },

  _onButtonClick: function (e) {
    let actionKey = e.target.getAttribute("data-action-key");
    IntegrationDialogActions.buttonClick(this.state.dialog, actionKey);
  },

  _onFilterChange: function (e) {
    this.filterChange(this.state.dialog, e.target.value);
  },

  _canRender: function() {
    return _.isString(this.state.view.signed_url)
      && _.isString(this.state.dialog.addon_key)
      && _.isString(this.state.dialog.key);
  },

  render: function () {
    return (
      <ModalDialog dialogId="integration-dialog"
                   size={this._auiDialogSize()}
                   customWidth={this._customDialogWidth()}
                   customHeight={this._customDialogHeight()}
                   title={this.state.dialog.title}
                   dialogBody={this._dialogBody}
                   dialogFilter={!!this.state.dialog.options.filter}
                   dialogFilterPlaceholder={this._dialogFilterPlaceholder()}
                   dialogFilterCallback={this._onFilterChange}
                   dialogFooterButton={this._dialogFooterButton}
                   dialogFooterLinks={this._dialogFooterLinks}
                   hint={this.state.dialog.options.hint}
                   isWarning={this._isWarning()}
                   noCloseLink={true}/>
    );
  },

  _retryLoadingPanel() {
    if (this.state.view.error) {
      IntegrationActions.fetchSignedUrl(this.state.dialog, this.props.room_id, this.state.view.url_template_values);
    }
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/integration_dialog/integration_dialog.js
 **/