var cx = require('classnames');

module.exports = React.createClass({

  displayName: "InlineDialog",

  propTypes: {
    onShow: React.PropTypes.func
  },

  componentDidMount: function() {
    if (!this.props.invisible) {
      this.props.onShow();
    }
  },

  componentDidUpdate: function(prevProps) {
    if (prevProps.invisible === this.props.invisible) {
      return;
    }

    if (this.props.invisible) {
      this.props.onHide();
    } else {
      this.props.onShow();
    }
  },

  componentWillUnmount: function() {
    if (!this.props.invisible) {
      this.props.onHide();
    }
  },

  getDefaultProps: function() {
    return {
      invisible: false,
      dialogId: "dialog",
      dialog_callout: false,
      onShow: _.noop,
      onHide: _.noop,
      onMouseOver: _.noop,
      arrowLocation: "top"
    };
  },

  render: function() {
    var classes = cx({
      "aui-inline-dialog": true,
      "dialog-callout": this.props.dialog_callout
    });

    var arrowClasses = cx("aui-inline-dialog-arrow arrow aui-css-arrow", {
      "aui-bottom-arrow": this.props.arrowLocation === 'bottom'
    });

    var dialogClasses = cx("aui-inline-dialog-contents", {
      "hc-tooltip-helper": this.props.tooltip_helper
    });

    return (
      <div className={classes} aria-hidden={this.props.invisible ? "true" : "false"} id={this.props.dialogId} onMouseOver={this.props.onMouseOver}>
        <div className={dialogClasses}>
          {this.props.children}
          <div className={arrowClasses}></div>
        </div>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/inline_dialog/inline_dialog.js
 **/