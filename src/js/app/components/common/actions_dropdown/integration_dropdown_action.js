var IntegrationsActions = require('actions/integrations_actions');

module.exports = React.createClass({

  displayName: "ActionsDropDownItem",

  propTypes: {
    msg: React.PropTypes.shape({
      mid: React.PropTypes.string,
      room: React.PropTypes.string
    }),
    action: React.PropTypes.shape({
      addon_key: React.PropTypes.string,
      full_key: React.PropTypes.string,
      key: React.PropTypes.string,
      target: React.PropTypes.shape({
        key: React.PropTypes.string
      })
    }),
    action_type: React.PropTypes.string
  },

  componentDidMount: function () {
    // Manually attach event listener, as event is triggered from AUI
    ReactDOM.findDOMNode(this.refs.element).addEventListener("click", this._onClick);
  },

  componentWillUnmount: function () {
    ReactDOM.findDOMNode(this.refs.element).removeEventListener("click", this._onClick);
  },

  render() {
    let action = this.props.action;

    return <li key={action.full_key}>
      <a ref="element"
         data-addon_key={action.addon_key}
         data-action_key={action.key}>
        {action.name}
      </a>
    </li>;
  },

  _onClick() {
    IntegrationsActions.invokeAction(this.props.action, {msg: this.props.msg});
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/actions_dropdown/integration_dropdown_action.js
 **/