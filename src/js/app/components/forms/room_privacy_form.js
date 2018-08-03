import RoomPrivacyRadios from "components/forms/room_privacy_radios";
import FlagActions from "actions/flag_actions";
import DialogActions from "actions/dialog_actions";
import FormActions from "actions/form_actions";
import strings from 'strings/forms_strings';

export default React.createClass({

  displayName: "RoomPrivacyForm",

  shouldComponentUpdate: function (nextProps) {
    var val;
    if (!nextProps.loading) {
      val = true;
    } else {
      val = false;
    }
    return val;
  },

  _onSubmit: function (e) {
    e.preventDefault();
    var form_inputs = $(ReactDOM.findDOMNode(this.refs.form)).serializeArray(),
        submit_data = {
          jid: this.props.jid,
          privacy: form_inputs[0].value
        };

    if (submit_data.privacy !== this.props.privacy) {
      DialogActions.startBtnLoading();
      FormActions.changeRoomPrivacy(submit_data, this._handleResponse);
    }
  },

  _handleResponse: function (error) {
    if (error) {
      this._throwFlagError(error.message || strings.fail.change_privacy_flag);
    } else {
      var privacy = (this.props.privacy === "public") ? "private" : "public";
      var success_msg = strings.success.privacy_changed(this.props.name, privacy);
      this._throwFlagSuccess(success_msg);
    }
    this._closeDialog();
  },

  _throwFlagSuccess: function (msg) {
    FlagActions.showFlag({
      type: "success",
      body: msg,
      close: "auto"
    });
  },

  _throwFlagError: function (error) {
    FlagActions.showFlag({
      type: "error",
      body: this._flagBody(error),
      close: "manual"
    });
  },

  _onFlagActionClick: function (e) {
    e.preventDefault();
    let flag_index = $(e.target).closest(".hc-flag").data('flag-index');
    FlagActions.removeFlag(flag_index);
    this._showDialog();
  },

  _flagBody: function (error_msg) {
    return () => (
        <div>
          <p className="hc-message-body">{error_msg}</p>
          <ul className="aui-nav-actions-list">
            <li><a onClick={this._onFlagActionClick} href="#">{strings.button.try_again}</a></li>
          </ul>
        </div>
    );
  },

  _showDialog: function () {
    DialogActions.showRoomPrivacyDialog({
      jid: this.props.jid,
      name: this.props.name,
      privacy: this.props.privacy
    });
  },

  _closeDialog: function () {
    DialogActions.closeDialog();
  },

  render: function () {
    return (
      <form id="room-privacy-form" ref="form" className="aui" onSubmit={this._onSubmit}>
        <RoomPrivacyRadios defaultChecked={this.props.privacy} private_desc={strings.description.privacy}/>
      </form>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/room_privacy_form.js
 **/