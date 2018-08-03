var strings = require('strings/common_strings');

function getErrorMessage(error) {
  var hasText = _.get(error, "error.text.__text");
  return (hasText) ? error.error.text.__text : "An error occurred";
}

module.exports = React.createClass({

  displayName: "GeneralError403",

  render: function () {
    var errorMessage = getErrorMessage(this.props.error);

    return (
      <section role="main" className="general-error-display aui-page-notification aui-page-size-medium">
        <div className="aui-page-panel">
          <div className="aui-page-pannel-inner">
            <section className="aui-page-panel-content">
              <h1><img src={`https://${this.props.web_server}/wc/assets/img/embedded/notsureif@3x.png`} alt="Not sure if" title="Not sure if" className="error-emoticon" width="38" height="50" /> {strings.youre_welcome}</h1>
              <div className="aui-page-notification-description">
                <p><strong>{errorMessage}</strong></p>
                <p><a href={`https://${this.props.web_server}/sign_in`}>{strings.sign_in}</a></p>
              </div>
            </section>
          </div>
        </div>
      </section>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_load/general_error_403.js
 **/