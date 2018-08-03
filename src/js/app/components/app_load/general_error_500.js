function getErrorMessage(error) {
  var hasText = _.get(error, "error.text.__text");
  return (hasText) ? error.error.text.__text : "An error occurred";
}

module.exports = React.createClass({

  displayName: "GeneralError500",

  render: function () {
    var errorMessage = getErrorMessage(this.props.error);

    return (
      <section role="main" className="general-error-display aui-page-notification aui-page-size-medium">
        <div className="aui-page-panel">
          <div className="aui-page-pannel-inner">
            <section className="aui-page-panel-content">
              <h1>Whoa! What did you do!? <img className="error-emoticon" src={`https://${this.props.web_server}/wc/assets/img/embedded/troll@3x.png`} width="50" height="50" /></h1>
              <div className="aui-page-notification-description">
                <p><strong>{errorMessage}</strong></p>
              </div>
            </section>
          </div>
        </div>
      </section>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_load/general_error_500.js
 **/