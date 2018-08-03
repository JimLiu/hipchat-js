import ModalDialog from "components/common/modal_dialog/modal_dialog";
import DialogActions from "actions/dialog_actions";
import FlagActions from "actions/flag_actions";
import strings from 'strings/dialog_strings';
import RoomDropDownActions from "actions/room_dropdown_actions";
import cx from 'classnames';

export default React.createClass({

  displayName: "DeleteRoomDialog",

  propTypes: {
    jid: React.PropTypes.string.isRequired
  },

  componentDidMount: function () {
    this._focusButton();
  },

  _dialogBody: function () {
    return strings.confirm_delete(this.props.name);
  },

  _dialogFooterButton: function () {
    var btnClasses = cx({
          'aui-button': true,
          'aui-button-primary': true
        });

    return (
      <button onClick={this._deleteRoom} className={btnClasses} aria-disabled={this.props.btnLoading} disabled={this.props.btnLoading}>{strings.delete_room}</button>
    );
  },

  _deleteRoom: function (e) {
    e.preventDefault();
    DialogActions.startBtnLoading();
    RoomDropDownActions.deleteRoom({
      jid: this.props.jid,
      id: this.props.room_id
    }, this._handleResponse);
  },

  _handleResponse: function (error) {
    if (error) {
      this._throwFlagError(error.message || strings.delete_room_fail);
    } else {
      var success_msg = strings.room_deleted(this.props.name);
      this._throwFlagSuccess(success_msg);
      RoomDropDownActions.closeRoom(this.props.jid);
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

  _flagBody: function (error_msg) {
    return () => (
      <div>
        <p className="hc-message-body">{error_msg}</p>
        <ul className="aui-nav-actions-list">
          <li><a onClick={this._flagActionClick} href="#">{strings.try_again}</a></li>
        </ul>
      </div>
    );
  },

  _flagActionClick: function (e) {
    e.preventDefault();
    var flag_index = $(e.target).closest(".flag").data('flag-index');
    FlagActions.removeFlag(flag_index);
    this._showDialog();
  },

  _showDialog: function () {
    DialogActions.showDeleteRoomDialog({
      jid: this.props.jid,
      name: this.props.name
    });
  },

  _closeDialog: function () {
    DialogActions.closeDialog();
  },

  _focusButton: function () {
    ReactDOM.findDOMNode(this).querySelector(".aui-button-primary").focus();
  },

  render: function () {
    return (
      <ModalDialog dialogId="delete-room-dialog"
        title={strings.delete_room}
        dialogBody={this._dialogBody}
        dialogFooterButton={this._dialogFooterButton}
        closeLinkText={strings.cancel}
        btnLoading={this.props.btnLoading}
        size="small" />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/delete_room_dialog/delete_room_dialog.js
 **/