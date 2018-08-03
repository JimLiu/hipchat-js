var AuiInput = require("./aui_input");

module.exports = React.createClass({

  displayName: "AuiRadio",

  _getDescription: function() {
    var desc = false;
    if (this.props.description) {
      if (this.props.description_is_link && this.props.description_link_action) {
        desc = (
          <div className="description">
            <a onClick={this.props.description_link_action.bind(this)}>{this.props.description}</a>
          </div>
        );
      } else {
        desc = (
          <div className="description">{this.props.description}</div>
        );
      }
    }
    return desc;
  },

  _getIcon: function() {
    if (this.props.icon) {
      var iconClass = `aui-icon hipchat-icon-small icon-${this.props.icon}`;
      return (
        <span className={iconClass}>{this.props.icon}</span>
      );
    }
  },



  render: function() {
    var name = this.props.name || this.props.id;
    var description = this._getDescription();
    var classNames = this.props.className || "";
    var icon = this._getIcon();

    return (
      <div className={`radio ${classNames}`}>
        <AuiInput type="radio"
                  ref="radio"
                  id={this.props.id}
                  name={name}
                  value={this.props.value}
                  checked={this.props.checked}
                  defaultChecked={this.props.defaultChecked}
                  onChange={this.props.onChange}/>
        <label htmlFor={this.props.id}>
          {icon}
          {this.props.label}
        </label>
        {description}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_radio.js
 **/