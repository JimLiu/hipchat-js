import PureRenderMixin from 'react-addons-pure-render-mixin';
import SimpleXDM from 'simple-xdm/host';
import IntegrationApi from 'api/api_integration';
import IntegrationsViewAction from 'actions/integrations_view_actions';
import Utils from 'helpers/utils';
import logger from 'helpers/logger';

module.exports = React.createClass({

  displayName: "IntegrationFrameView",

  propTypes: {
    integration: React.PropTypes.shape({
      addon_key: React.PropTypes.string.isRequired,
      key: React.PropTypes.string.isRequired
    }).isRequired,
    signed_url: React.PropTypes.string.isRequired,
    room_id: React.PropTypes.string.isRequired,
    init_event: React.PropTypes.object
  },

  mixins: [PureRenderMixin],
  getInitialState: function() {
    IntegrationApi.registerModules();
    var xdm = SimpleXDM.create(this.props.integration);
    return {xdm: xdm};
  },

  componentWillUnmount: function() {
    SimpleXDM.unregisterExtension({
      addon_key: this.props.integration.addon_key,
      key: this.props.integration.key
    });
  },

  componentDidMount: function() {
    this._dispatchInitEvent();
  },

  componentDidUpdate: function() {
    this._dispatchInitEvent();
  },

  _dispatchInitEvent: function() {
    if (this.props.init_event) {
      logger.debug('[HC-Integrations]', `Dispatching event ${this.props.init_event.event} to ${this.props.integration.full_key}`, this.props.init_event.parameters);
      SimpleXDM.dispatch(this.props.init_event.event, this.props.integration, this.props.init_event.parameters);
    }
  },

  _onLoad: function() {
    IntegrationsViewAction.iframeLoaded({
      integration: this.props.integration,
      room_id: this.props.room_id,
      duration: Math.floor(Utils.timings.now() - this.startTimestamp)
    });
  },

  render: function() {
    this.startTimestamp = Utils.timings.now();
    var xdm = this.state.xdm;
    return (<iframe className="hc-addon-iframe" id={xdm.id} name={xdm.name} src={this.props.signed_url}
                    onLoad={this._onLoad}/>);
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/integration/integration_frame.js
 **/