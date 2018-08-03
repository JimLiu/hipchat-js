module.exports = React.createClass({

  displayName: "AuiTextarea",

  propTypes: {
    onChange: React.PropTypes.func,
    onFocus: React.PropTypes.func,
    onBlur: React.PropTypes.func
  },

  getDefaultProps: function() {
    return {
      onChange: () => {},
      onFocus: () => {},
      onBlur: () => {}
    };
  },

  render: function() {

    var name = this.props.name || this.props.id;
    var classes = (this.props.size) ? "textarea " + this.props.size : "textarea";

    return (
      <textarea {...this.props} className={classes} name={name}></textarea>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_textarea.js
 **/