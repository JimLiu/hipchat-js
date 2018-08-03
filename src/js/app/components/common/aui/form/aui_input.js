module.exports = React.createClass({

  displayName: "AuiInput",

  propTypes: {
    onChange: React.PropTypes.func,
    onFocus: React.PropTypes.func,
    onBlur: React.PropTypes.func
  },

  getDefaultProps: function() {
    return {
      type: "text",
      onChange: () => {},
      onFocus: () => {},
      onBlur: () => {}
    };
  },

  focus: function() {
    ReactDOM.findDOMNode(this.refs.input).focus();
  },

  render: function() {

    var name = this.props.name || this.props.id;
    var classes = (this.props.size) ? this.props.type + " " + this.props.size : this.props.type;

    return (
      <input {...this.props} ref="input" className={classes} name={name} />
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_input.js
 **/