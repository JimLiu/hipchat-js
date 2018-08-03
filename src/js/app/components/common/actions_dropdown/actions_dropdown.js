var AppDispatcher = require('dispatchers/app_dispatcher');

module.exports = React.createClass({

  displayName: "ActionsDropDown",

  propTypes: {
    dropdown_id: React.PropTypes.string,
    lazy_options: React.PropTypes.func,
    onShow: React.PropTypes.func,
    onHide: React.PropTypes.func,
    default_option: React.PropTypes.oneOf(["first","last"])
  },

  getDefaultProps() {
    return {
      onShow: _.noop,
      onHide: _.noop,
      onItemSelect: _.noop,
      button_class: "aui-button aui-button-subtle aui-dropdown2-trigger-arrowless",
      default_option: "first"
    };
  },

  shouldComponentUpdate() {
    // We don't want this component to update after its initial render, as it's DOM is mutated by the
    //  drop down component
    return false;
  },

  componentDidMount() {
    // Listen to show / hide events as these let us update the application state
    this._getContainer().on("aui-dropdown2-hide", this._onDismiss);
    this._getContainer().on("aui-dropdown2-show", this._onShow);
  },

  componentWillUnmount() {
    this._getContainer().off();
    $(window).off("resize", this._dismiss);
    AppDispatcher.unregister("dismiss-active-actions-dropdown", this._dismiss);
  },

  render(){
    return (
      <div className="hc-dropdown">
        {this._renderTrigger()}
        {this._renderContainer()}
      </div>
    );
  },

  _onShow() {
    let trigger = this._getTrigger();
    let container = this._getContainer();

    // Manually render menu items if we are using deferred rendering
    //  as DOM has already been modified by AUI DropDown
    if (this.props.lazy_options) {
      ReactDOM.render(
        this._renderOptions(),
        container[0]);
    }

    //If too close to bottom, float above '...' menu. This case is handled better in AUI
    //   5.8, so we should remove this when that becomes available TODO: HC-19161
    if (($('body').height() < container.position().top + container.height()) || this.props.location === "above") {
      container.css("top", container.position().top - container.outerHeight() - trigger.outerHeight() + "px");
      container.addClass("hc-dropdown-above");
      trigger.addClass("hc-dropdown-above");
    }

    if (this.props.location_horizontal === "left") {
      container.css("left", trigger.offset().left + trigger.outerWidth() - container.outerWidth());
    }

    // If the user scrolls, we want to dismiss the popup for now
    AppDispatcher.registerOnce("dismiss-active-actions-dropdown", this._dismiss);
    $(window).one("resize", this._dismiss);

    if (this.props.default_option === "last") {
      container.one("aui-dropdown2-item-selected", () => {
        container.find(".active.aui-dropdown2-active").removeClass("active aui-dropdown2-active");
        container.find("a").last().addClass("active aui-dropdown2-active");
      });
    }

    this.props.onShow();
  },

  _onDismiss() {
    var container = this._getContainer();
    let trigger = this._getTrigger();

    container.removeAttr('style');
    container.removeClass("hc-dropdown-above");
    trigger.removeClass("hc-dropdown-above");

    // Unregister the is scrolling listener in case it wasn't the bit that triggered this dismiss
    $(window).off("resize", this._dismiss);
    AppDispatcher.unregister("dismiss-active-actions-dropdown", this._dismiss);

    // Remove all menu items
    if (this.props.lazy_options) {
      ReactDOM.unmountComponentAtNode(container[0]);
    }

    this.props.onHide();
  },

  _renderContainer() {
    var options;
    if (!this.props.lazy_options) {
      options = this._renderOptions();
    }

    return (
      <div className="aui-style-default aui-dropdown2 hc-dropdown-container" id={this.props.dropdown_id} aria-hidden="true">
        {options}
      </div>
    );
  },

  _renderTrigger() {
    return (
      <button className={"hc-dropdown-trigger aui-dropdown2-trigger " + this.props.button_class}
                     aria-owns={this.props.dropdown_id}
                     aria-haspopup="true"
                     data-container={this.props.container}
                     id={this.props.dropdown_id + "-trigger"}
                     data-no-focus>
        <span className={"aui-icon aui-icon-small " + this.props.icon}></span>
      </button>
    );
  },

  _renderOptions() {
    var options = this.props.children;

    if (this.props.lazy_options) {
      options = this.props.lazy_options();
    }

    return (
      <div className="aui-dropdown2-section">
        {options}
      </div>
    );
  },

  _getContainer() {
    // TODO: HC-20466 - use $ instead of AJS.$ when we consolidate jquery instances
    return AJS.$("#" + this.props.dropdown_id);
  },

  _getTrigger() {
    // TODO: HC-20466 - use $ instead of AJS.$ when we consolidate jquery instances
    return AJS.$("#" + this.props.dropdown_id + "-trigger");
  },

  _dismiss() {
    this._getTrigger().trigger("aui-button-invoke");
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/actions_dropdown/actions_dropdown.js
 **/