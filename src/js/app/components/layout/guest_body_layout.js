var GeneralErrorsStore = require("stores/general_errors_store"),
    LayoutStore = require("stores/layout_store"),
    MainCol = require("components/main_column/main_col"),
    GeneralErrorDisplay = require("components/app_load/general_error_display");

module.exports = React.createClass({

  displayName: "GuestBodyLayout",

  getInitialState: function() {
    return {
      errors: GeneralErrorsStore.get('errors'),
      ready: LayoutStore.get('ready'),
      web_server: GeneralErrorsStore.get('web_server')
    };
  },

  componentDidMount: function() {
    GeneralErrorsStore.on('change', this._onChange);
    LayoutStore.on('change:ready', this._onChange);
  },

  componentWillUnmount: function() {
    GeneralErrorsStore.off('change', this._onChange);
    LayoutStore.off('change:ready', this._onChange);
  },

  componentDidUpdate: function() {
    $(window).trigger("resize");
  },

  _onChange: function () {
    this.setState(this.getInitialState());
  },

  render: function() {
    var body;

    if (this.state.errors.length) {
      body = <GeneralErrorDisplay errors={this.state.errors} />;
    } else {
      body = (
        <div className="hc-layout">
          <MainCol ref="main_column" is_guest={this.props.is_guest} />
        </div>
      );
    }

    return body;
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/layout/guest_body_layout.js
 **/