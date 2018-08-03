import DialogActions from "actions/dialog_actions";
import ModalDialog from "components/common/modal_dialog/modal_dialog";
import strings from 'strings/dialog_strings';
import ieSubmitMixin from 'components/mixins/ie_submit_mixin';
import DialogVisibilityMixin from 'components/mixins/modal_dialog_visibility_mixin';
import AppConfig from 'config/app_config';

export default React.createClass({

  displayName: "NotEditableDialog",

  mixins: [ieSubmitMixin, DialogVisibilityMixin],

  _dialogBody: function () {
    const hourInMillis = 1000 * 60 * 60;
    const thresholdInHours = Math.round(AppConfig.edit_message_threshold / hourInMillis);
    return <p>{strings.not_editable_body(thresholdInHours)}</p>;
  },

  _dialogFooterButton: function () {
    return (
      <button form="not-editable-message-form" className="aui-button aui-button-primary" type="submit" onClick={DialogActions.closeDialog}>{strings.OK}</button>
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="not-editable-dialog"
                   title={strings.not_editable(this.props.action)}
                   dialogBody={this._dialogBody}
                   dialogFooterButton={this._dialogFooterButton}
                   noCloseLink={true} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/edit_message_dialog/not_editable_dialog.js
 **/