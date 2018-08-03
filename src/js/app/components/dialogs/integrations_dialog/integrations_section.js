import Integration from "./integration";

const PropTypes = React.PropTypes;

const IntegrationsSection = React.createClass({
  defaultProps: {
    showGlobalLozenge: false,
    actions: _.noop
  },

  propTypes: {
    actions: PropTypes.func,
    showGlobalLozenge: PropTypes.bool,
    section: PropTypes.string.isRequired,
    status: PropTypes.string,
    integrations: PropTypes.arrayOf(PropTypes.object).isRequired
  },

  render() {
    if (this.props.integrations.length === 0) {
      return null;
    }

    let description = null, status = null;

    if (this.props.description) {
      description = <div className="hc-integration-section-description">
        <p>{this.props.description}</p>
      </div>;
    }

    if (this.props.status) {
      status = <span className="hc-integrations-installed-count">{this.props.status}</span>;
    }

    let rendered_integrations = _.map(this.props.integrations, (integration, i) =>
      <Integration key={i}
                   integration={integration}
                   actions={this.props.actions}
                   showGlobalLozenge={this.props.showGlobalLozenge}/>);

    return <div className={`hc-integration-section hc-integration-section-${this.props.section}`}>
      <div className="hc-integration-section-title">
        <h5>{this.props.title}</h5>
        {status}
      </div>
      {description}
      <ul className="hc-integrations-list">
        {rendered_integrations}
      </ul>
    </div>;
  }
});

export default IntegrationsSection;



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/integrations_dialog/integrations_section.js
 **/