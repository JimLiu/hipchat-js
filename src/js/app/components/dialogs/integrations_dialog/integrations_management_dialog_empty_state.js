import strings from 'strings/empty_state_strings';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import IntegrationHelper from 'helpers/integration_helper';

const PropTypes = React.PropTypes;

export default React.createClass({

  displayName: 'IntegrationsDialogEmptyState',

  mixins: [PureRenderMixin],

  propTypes: {
    active_chat_id: PropTypes.string,
    user_id: PropTypes.number,
    web_server: PropTypes.string,
    can_manage_integrations: PropTypes.bool
  },

  render() {
    let url = this.props.can_manage_integrations ? IntegrationHelper.getIntegrationsUrl(this.props.web_server, this.props.active_chat_id, this.props.user_id) : IntegrationHelper.getIntegrationsBaseUrl(this.props.web_server);

    return (
      <div className="hc-integrations-empty-state">
        <div className="hc-integrations-es-img"></div>
        <p>
          {strings.empty_integrations_text}
        </p>
        <p>
          <a className="aui-button aui-button-primary" href={url} target="_blank">{strings.check_out_integrations}</a>
        </p>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/integrations_dialog/integrations_management_dialog_empty_state.js
 **/