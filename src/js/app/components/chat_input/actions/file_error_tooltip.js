module.exports = React.createClass({

  displayName: "FileErrorTooltip",

  componentDidMount: function(){
    this._positionTooltip();
  },

  componentDidUpdate: function(){
    this._positionTooltip();
  },

  _positionTooltip: function() {
    if (!this.props.anchor) {
      return true;
    }
    var elem = ReactDOM.findDOMNode(this),
        anchor = this.props.anchor,
        bottom = anchor.offsetHeight,
        left = -elem.offsetWidth / 2 + anchor.offsetWidth / 2;

    elem.style.bottom = bottom + 'px';
    elem.style.left = left + 'px';
  },

  render: function () {
    return (
      <div className="tipsy aui-form-notification-tooltip aui-form-notification-tooltip-error tipsy-s" role="tooltip">
        <div className="tipsy-arrow tipsy-arrow-s"></div>
        <div className="tipsy-inner">{this.props.error}</div>
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/actions/file_error_tooltip.js
 **/