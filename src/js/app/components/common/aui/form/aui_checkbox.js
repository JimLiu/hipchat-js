export default React.createClass({

  displayName: "AuiCheckbox",

  propTypes: {
    defaultChecked: React.PropTypes.bool,
    onChange: React.PropTypes.func
  },

  getDefaultProps: function() {
    return {
      value: true,
      defaultChecked: false,
      onChange: () => {}
    };
  },

  render: function() {
    let props = _.clone(this.props);
        props.name = this.props.name || this.props.id;
    return (
      <input type="checkbox" className="checkbox" {...props} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_checkbox.js
 **/