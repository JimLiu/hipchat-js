module.exports = React.createClass({

  displayName: "AuiFormFieldGroup",

  _getDescription: function () {
    if (this.props.description) {
      return (
        <div className="description">{this.props.description}</div>
      );
    }
  },

  _getRequiredIcon: function () {
    if (this.props.required) {
      return (
        <span className="aui-icon icon-required"> required</span>
      );
    }
  },

  getError: function() {
    if (this.props.error) {
      return (
        <div className="error">{this.props.error}</div>
      );
    }
  },

  render: function() {
    var name = this.props.name || this.props.id;
    var description = this._getDescription();
    var requiredIcon = this._getRequiredIcon();
    var error = this.getError();
    var classes = "field-group";

    if (this.props.labelPosition) {
      classes += " label-position-" + this.props.labelPosition;
    }

    return (
      <div className={classes}>
        <label htmlFor={name}>
          {this.props.label}
          {requiredIcon}
        </label>
        {this.props.children}
        {description}
        {error}
      </div>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_form_fieldgroup.js
 **/