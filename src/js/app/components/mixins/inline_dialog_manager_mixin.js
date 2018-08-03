var InlineDialogActions = require("actions/inline_dialog_actions");

function _hideLayerFromEscKeypress(e) {
  var intKey = (window.Event) ? e.which : e.keyCode;
  if (intKey === 27) {
    InlineDialogActions.hideInlineDialog();
  }
}

function _hideLayerFromClick(e) {
  var $target = $(e.target);
  if ($target.closest(".aui-inline-dialog-trigger").length === 0 && $target.parents(".aui-inline-dialog").length === 0) {
    InlineDialogActions.hideInlineDialog();
  }
}

module.exports = {
  componentDidMount: function() {
    window.addEventListener('keydown', _hideLayerFromEscKeypress);
    window.addEventListener('click', _hideLayerFromClick);
  },

  componentWillUnmount: function() {
    window.removeEventListener('keydown', _hideLayerFromEscKeypress);
    window.removeEventListener('click', _hideLayerFromClick);
  },

  _onKeyDown: _hideLayerFromEscKeypress
};


/** WEBPACK FOOTER **
 ** ./src/js/app/components/mixins/inline_dialog_manager_mixin.js
 **/