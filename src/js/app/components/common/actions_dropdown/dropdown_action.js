module.exports = React.createClass({

  displayName: "GenericDropDownAction",

  propTypes: {
    onClick: React.PropTypes.func,
    title: React.PropTypes.string,
    item_id: React.PropTypes.string
  },

  componentDidMount: function () {
    // Manually attach event listener, as event is triggered from AUI
    ReactDOM.findDOMNode(this.refs.element).addEventListener("click", this._onClick);
  },

  componentWillUnmount: function () {
    ReactDOM.findDOMNode(this.refs.element).removeEventListener("click", this._onClick);
  },

  render() {
    return <li>
      <a id={this.props.item_id} ref="element">{this.props.title}</a>
    </li>;
  },

  _onClick: function (evt) {
    this.props.onClick(evt);
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/actions_dropdown/dropdown_action.js
 **/