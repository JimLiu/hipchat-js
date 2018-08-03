import IntegrationFrame from 'components/common/integration/integration_frame';
import Glance from 'components/right_sidebar/integrations/glance';
import IntegrationsViewStore from 'stores/integrations_view_store';
import PreferencesStore from 'stores/preferences_store';
import Spinner from 'components/common/spinner/spinner';
import Utils from 'helpers/utils';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import IntegrationActions from 'actions/integrations_view_actions';
import strings from 'strings/integrations_strings';
import AppConfig from 'config/app_config';

export default React.createClass({

  displayName: "RightSideBarIntegrationView",

  propTypes: {
    hideIntegrationView: React.PropTypes.func.isRequired,
    integration: React.PropTypes.shape({
      full_key: React.PropTypes.string.isRequired,
      addon_key: React.PropTypes.string.isRequired,
      key: React.PropTypes.string.isRequired,
      name: React.PropTypes.string.isRequired
    }).isRequired,
    room_id: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number
    ]),
    glance: React.PropTypes.shape({
      name: React.PropTypes.string.isRequired,
      full_key: React.PropTypes.string.isRequired,
      addon_key: React.PropTypes.string.isRequired,
      key: React.PropTypes.string.isRequired,
      icon: React.PropTypes.object.isRequired,
      query_url: React.PropTypes.string,
      target: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.object
      ])
    }),
    url_template_values: React.PropTypes.object,
    init_event: React.PropTypes.object,
    loading: React.PropTypes.bool
  },

  mixins: [PureRenderMixin],

  getInitialState: function () {
    let theme = PreferencesStore.get('theme');
    return _.extend({
      signed_url_loading: true,
      frame_loading: true,
      theme: theme
    }, this._getState());
  },

  componentDidMount: function() {
    IntegrationsViewStore.onIntegrationViewStatusChange(this.props.room_id, this.props.integration.full_key, this._onChange);
    PreferencesStore.on('change:theme', this._onChange);
  },

  componentWillUnmount: function() {
    IntegrationsViewStore.offIntegrationViewStatusChange(this.props.room_id, this.props.integration.full_key, this._onChange);
    PreferencesStore.off('change:theme', this._onChange);
  },

  _renderStaticHeader() {
    // We use the view as a static glance (name+icon if available)
    return <Glance glance={this.props.integration} room_id={this.props.room_id} />;
  },

  render: function () {

    let header;
    if (_.isObject(this.props.glance)) {
      header = (
        <Glance glance={this.props.glance} room_id={this.props.room_id} />
      );
    } else {
      header = this._renderStaticHeader();
    }

    return (
      <div className="hc-integration-view-sidebar">
        <div className="hc-integration-sidebar-header">
          <div className="hc-integration-view-name">
            {header}
            <span ref="close_button"
                  onClick={this.props.hideIntegrationView}
                  className="aui-icon aui-icon-small aui-iconfont-close-dialog close"></span>
          </div>
        </div>

        <Spinner spin={this._loading()} zIndex={1} delay={this._spinnerDelay()}/>
        {this._content()}

      </div>
    );
  },

  _loading() {
    if (this.props.integration.internal) {
      return this.props.loading;
    }
    return this.state.signed_url_loading || (this.state.signed_url && this.state.frame_loading);
  },

  _content() {
    if (this.state.is_error) {
      return <div className="hc-integrations-error">
        <div className="hc-integrations-error-image"/>
        <p>{strings.integration_failed_to_load}</p>
        <button onClick={this._retryLoadingPanel} className="aui-button aui-button-primary">
          {strings.retry}
        </button>
      </div>;
    }

    if (!this.props.integration.internal && this.state.signed_url) {
      return this._renderIntegrationFrame();
    }

    if (this.props.integration.internal){
      return this.props.children;
    }

    return null;
  },

  _renderIntegrationFrame: function () {
    let signed_url = Utils.appendQueryParameter(this.state.signed_url, "theme", this.state.theme);

    return (
      <IntegrationFrame integration={this.props.integration}
                        signed_url={signed_url}
                        room_id={this.props.room_id}
                        init_event={this.props.init_event}/>
    );
  },

  _onChange: function() {
    this.setState(this._getState());
  },

  _getState: function() {
    let theme = PreferencesStore.get('theme');
    let integrationViewStatus = IntegrationsViewStore.getIntegrationViewStatus(this.props.room_id, this.props.integration.full_key) || {};
    integrationViewStatus.theme = theme;
    return integrationViewStatus;
  },

  _retryLoadingPanel() {
    if (this.state.is_error) {
      IntegrationActions.fetchSignedUrl(this.props.integration, this.props.room_id, this.state.url_template_values);
    }
  },

  _spinnerDelay: function() {
    let isLoadingPossiblyCachedContents = this.state.signed_url && this.state.frame_loading
      && this.props.integration.authentication === 'none';
    return isLoadingPossiblyCachedContents ? AppConfig.integrations.spinner_delay : 0;
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/integrations/integration_view.js
 **/