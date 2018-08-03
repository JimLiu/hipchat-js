var AuiFormFieldGroup = require("./aui_form_fieldgroup"),
    AuiInput = require("./aui_input");

module.exports = React.createClass({

  displayName: "AuiInputFieldGroup",

  focus: function() {
    this.refs.input.focus();
  },

  render: function() {
    return (
      <AuiFormFieldGroup {...this.props}>
        <AuiInput ref="input" {...this.props} />
      </AuiFormFieldGroup>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_input_fieldgroup.js
 **/