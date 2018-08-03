var cx = require('classnames');

module.exports = React.createClass({

  displayName: "Icon",

  getDefaultProps: function() {
    return {
      classes: {},
      iconName: "chat",
      active: false,
      uid: ''
    };
  },

  _getClassNames: function() {
    return _.assign({}, {
      "aui-icon": true,
      "hipchat-icon-small": true
    }, this.props.classes);
  },

  render: function() {
    var classNames = this._getClassNames();
    var iconHtml = "<svg class='" + cx(classNames) + "' data-uid='" + this.props.uid + "'><use xlink:href='#icon-" + this.props.iconName + "'></use></svg>";

    return (
      <span dangerouslySetInnerHTML={{__html: iconHtml}}></span>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/icon/icon.js
 **/