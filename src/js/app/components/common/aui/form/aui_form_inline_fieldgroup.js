module.exports = React.createClass({

  displayName: "AuiFormInlineFieldGroup",

  getDefaults: function() {
    return {
      className: ''
    };
  },

  render: function() {
    return (
      <div className={`inline-field-group ${this.props.className}`}>
        {this.props.children}
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_form_inline_fieldgroup.js
 **/