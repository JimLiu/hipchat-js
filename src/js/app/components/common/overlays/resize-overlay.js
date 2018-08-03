var cx = require('classnames');

module.exports = React.createClass({

  displayName: 'ResizeOverlay',

  getDefaultProps: function() {
    return {
      'show-overlay': false
    };
  },

  render: function(){
      var classNames = cx({
        'overlay': true,
        'resize-overlay': true,
        'show-overlay': this.props.show_overlay
      });

      return (
        <div className={classNames}></div>
      );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/overlays/resize-overlay.js
 **/