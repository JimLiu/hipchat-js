var AuiFormFieldGroup = require("./aui_form_fieldgroup"),
    AuiTextArea = require("./aui_textarea");

module.exports = React.createClass({

  displayName: "AuiTextAreaFieldGroup",

  render: function() {
    return (
      <AuiFormFieldGroup {...this.props}>
        <AuiTextArea {...this.props} />
      </AuiFormFieldGroup>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_textarea_fieldgroup.js
 **/