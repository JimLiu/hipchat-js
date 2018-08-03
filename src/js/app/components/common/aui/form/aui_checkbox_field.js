var AuiCheckbox = require("./aui_checkbox");

module.exports = React.createClass({

  displayName: "AuiCheckBoxField",

  render: function() {
    return (
      <div className="checkbox">
        <AuiCheckbox key={_.uniqueId()} {...this.props} />
        <label htmlFor={this.props.id} key={_.uniqueId()}>{this.props.label}</label>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_checkbox_field.js
 **/