const PropTypes = React.PropTypes;

const Integration = React.createClass({
  propTypes: {
    actions: PropTypes.func.isRequired,
    showGlobalLozenge: PropTypes.bool.isRequired,
    integration: PropTypes.shape({
      name: PropTypes.string,
      icon: PropTypes.string
    }).isRequired
  },

  render() {
    let actions = null,
      icon = <div className="hc-integration-icon hc-integration-icon-default"></div>,
      scope = null;

    if (this.props.integration.icon) {
      icon = <img src={this.props.integration.icon} className="hc-integration-icon"/>;
    }

    if (this.props.integration.context === "global" && this.props.showGlobalLozenge) {
      scope = <span className="aui-lozenge aui-lozenge-subtle">Global</span>;
    }

    if (this.props.actions) {
      actions = this.props.actions(this.props.integration);
    }

    return (
      <li>
        {icon}
        <div className="hc-integration-name">{this.props.integration.name}</div>
        <span className="hc-integration-management-right">
          {scope}
          {actions}
        </span>
      </li>
    );
  }
});

export default Integration;


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/integrations_dialog/integration.js
 **/