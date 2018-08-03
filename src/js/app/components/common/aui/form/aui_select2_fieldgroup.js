var AuiFormFieldGroup = require("./aui_form_fieldgroup"),
    AuiSelect2Input = require("./aui_select2_input");

module.exports = React.createClass({

  displayName: "AuiSelect2FieldGroup",

  render: function() {
    let {
      id, size, name,
      placeholder, multiple, selected,
      maxDisplayedItems, data, formatNoMatches,
      sortResults
    } = this.props;

    let select2Options = {
      id, size, name,
      placeholder, multiple, selected,
      maxDisplayedItems, data, formatNoMatches
    };

    if (sortResults) {
      select2Options.sortResults = sortResults;
    }

    return (
      <AuiFormFieldGroup {...this.props}>
        <AuiSelect2Input {...select2Options}/>
      </AuiFormFieldGroup>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_select2_fieldgroup.js
 **/