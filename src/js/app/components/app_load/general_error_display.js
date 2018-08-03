var GeneralError403 = require("./general_error_403");
var GeneralError500 = require("./general_error_500");

module.exports = React.createClass({

  displayName: "GeneralErrorDisplay",

  render: function () {
    var stanza = this.props.errors[0],
        error;

    if (stanza.error.code === "500") {
      error = <GeneralError500 error={stanza} web_server={this.props.web_server} />;
    } else {
      error = <GeneralError403 error={stanza} web_server={this.props.web_server} />;
    }
    return error;
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_load/general_error_display.js
 **/