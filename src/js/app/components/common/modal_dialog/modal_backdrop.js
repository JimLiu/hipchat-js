var ModalDialogVisibilityMixin = require("components/mixins/modal_dialog_visibility_mixin");
var DialogActions = require("actions/dialog_actions");

module.exports = React.createClass({

  displayName: "ModalDialogBackdrop",

  mixins: [ModalDialogVisibilityMixin],

  componentDidMount: function() {
    document.querySelector("body").addEventListener('keydown', this._onKeydown);
  },

  componentWillUnmount: function() {
    document.querySelector("body").removeEventListener('keydown', this._onKeydown);
  },

  getDefaultProps: function() {
    return {
      btnLoading: false,
      bgDismiss: true
    };
  },

  _onKeydown: function (e) {
    var intKey = (window.Event) ? e.which : e.keyCode;
    if (intKey === 27 && !this.props.btnLoading) {
      this.close();
    }
  },

  _onClick: function () {
    if (!this.props.btnLoading && this.props.bgDismiss) {
      this.close();
    }
  },

  close: function() {
    DialogActions.closeDialog();
  },

  render: function() {
    return (
      <div className="aui-blanket"
            aria-hidden={!this.state.dialogVisible}
            tabIndex="0"
            onClick={this._onClick}>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/modal_dialog/modal_backdrop.js
 **/