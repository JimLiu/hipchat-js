var utils = require('helpers/utils');

module.exports = React.createClass({

  displayName: "TextAreaCaretMirror",

  render: function() {
    if (!this.props.textarea_ref) {
      return <div/>;
    }
    var $src = $(this.props.textarea_ref);
    if ($src.length < 1) {
      return <div/>;
    }
    var caretPosn = utils.getCaretPosition($src.get(0)),
        pre = $src.val().substring(0, caretPosn),
        post = $src.val().substring(caretPosn),
        containerStyles = {
          'position': 'absolute',
          'overflow': 'auto',
          'whiteSpace': 'pre-wrap',
          'wordWrap': 'break-word',
          'top': 0,
          'left': -9999
        },
        caretStyles = {
          'position': 'absolute'
        },
        stylesToMirror = [
          // Box Styles.
          'boxSizing', 'height', 'width', 'paddingBottom'
          , 'paddingLeft', 'paddingRight', 'paddingTop'

          // Font stuff.
          , 'fontFamily', 'fontSize', 'fontStyle'
          , 'fontVariant', 'fontWeight'

          // Spacing etc.
          , 'wordSpacing', 'letterSpacing', 'lineHeight'
          , 'textDecoration', 'textIndent', 'textTransform'

          // The direction.
          , 'direction'
        ];
    for (var i = 0; i < stylesToMirror.length; i++) {
      containerStyles[stylesToMirror[i]] = $src.css(stylesToMirror[i]);
    }
    return (
      <div style={containerStyles}>
        {pre}
        <span ref="caret" className="hc-textarea-caret" style={caretStyles}></span>
        {post}
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/autocomplete/textarea_caret_mirror.js
 **/