import DialogActions from "actions/dialog_actions";
import ModalDialogVisibilityMixin from "components/mixins/modal_dialog_visibility_mixin";
import utils from "helpers/utils";
import cx from "classnames";

export default React.createClass({

  displayName: "ModalDialogAlternate",

  propTypes: {
    size: React.PropTypes.oneOf(['small', 'medium', 'large', 'xlarge'])
  },

  mixins: [ModalDialogVisibilityMixin],

  componentDidMount: function() {
    document.querySelector("body").addEventListener('keydown', this._onKeyDown);
  },

  componentWillUnmount: function() {
    document.querySelector("body").removeEventListener('keydown', this._onKeyDown);
  },

  getDefaultProps: function() {
    return {
      dialogId: "dialog",
      size: "medium",
      dialogBody: _.noop
    };
  },

  close: function() {
    DialogActions.closeDialog();
  },

  _onKeyDown: function (e) {
    var key = (window.Event) ? e.which : e.keyCode;
    if (key === utils.keyCode.Esc) {
      this.close();
    }
  },

  _onClick: function () {
    this.close();
  },

  render: function() {
    let sizeClass = "aui-dialog2-" + this.props.size,
        classes = cx({
          "aui-layer": true,
          "aui-dialog2": true,
          "modal-dialog-alt": true
        }, sizeClass);

    return (
      <section role="dialog" id={this.props.dialogId} className={classes} aria-hidden={!this.state.dialogVisible}>
        <div className="aui-dialog2-content">
          {this.props.dialogBody()}
        </div>
      </section>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/modal_dialog/modal_dialog_alternate.js
 **/