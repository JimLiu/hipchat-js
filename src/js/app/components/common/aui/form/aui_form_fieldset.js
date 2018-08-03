module.exports = React.createClass({

  displayName: "AuiFormFieldSet",

  render: function() {
    var classNames = this.props.className || "";
    return (
      <fieldset className={`group ${classNames}`}>
        <legend><label htmlFor={this.props.id}>{this.props.label}</label></legend>
        {this.props.children}
      </fieldset>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_form_fieldset.js
 **/