import ModalDialog from "components/common/modal_dialog/modal_dialog";
import RoomsNavStore from "stores/rooms_nav_store";
import DialogActions from "actions/dialog_actions";
import FlagActions from "actions/flag_actions";
import strings from 'strings/dialog_strings';
import RoomDropDownActions from "actions/room_dropdown_actions";
import utils from "helpers/utils";

export default React.createClass({

  displayName: "ArchiveRoomDialog",

  componentDidMount: function () {
    RoomsNavStore.on(['change'], this._onChange);
  },

  componentWillUnmount: function () {
    RoomsNavStore.off(['change'], this._onChange);
  },

  getInitialState: function () {
    return this._getActiveChatState();
  },

  _getActiveChatState: function () {
    return {
      active_chat: RoomsNavStore.get("active_chat"),
      rooms: RoomsNavStore.get("rooms")
    };
  },

  _onChange: function () {
    this.setState(this._getActiveChatState());
  },

  _dialogBody: function () {
    return (
      this.props.archive ?
        <div>
        <p><strong>{strings.really_archive(this._getRoomName())}</strong></p>
        <p>{strings.confirm_archive}</p>
      </div> : <p>{strings.really_unarchive(this._getRoomName())}</p>
    );
  },

  _dialogFooterButton: function () {
    return (
      <button onClick={this.onAction(this.props.archive)} className="aui-button aui-button-primary">{this.props.archive ? strings.archive : strings.unarchive}</button>
    );
  },

  _getRoomName: function () {
    return utils.room.get_room_name(_.keyBy(this.state.rooms.rooms, "jid"), this.state.active_chat);
  },

  _getRoomId: function () {
    return utils.room.get_room_id(_.keyBy(this.state.rooms.rooms, "jid"), this.state.active_chat);
  },

  onAction(archive){

    let data = {
      jid: this.state.active_chat,
      id: this._getRoomId()
    };

    let cb = this._buildResponseHandler(archive);

    return (evt) => {
      if (evt) {
        evt.preventDefault();
      }
      if (archive) {
        RoomDropDownActions.archiveRoom(data, cb);
      } else {
        RoomDropDownActions.unarchiveRoom(data, cb);
      }
      DialogActions.closeDialog();
    };
  },

  _buildResponseHandler(archive) {
    return (data) => {
      if (data.error) {
        var error_msg = archive ? strings.archive_fail : strings.unarchive_fail;
        this._throwFlagError(error_msg);
      } else {
        var success_msg = archive ? strings.room_archived : strings.room_unarchived;
        this._throwFlagSuccess(success_msg);
      }
    };
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
          <li><a onClick={ this.onFlagClickAction(this.props.archive) }>{strings.try_again}</a></li>
        </ul>
      </div>
    );
  },

  onFlagClickAction(archive){

    let action = this.onAction(archive);

    return (e) => {
      let flag_index = $(e.target).closest(".flag").data('flag-index');
      FlagActions.removeFlag(flag_index);
      action(e);
    };
  },

  render: function () {
    return (
      <ModalDialog dialogId="archive-room-dialog"
        title={this.props.archive ? strings.archive_room_name(this._getRoomName()) : strings.unarchive_room_name(this._getRoomName())}
        dialogBody={this._dialogBody}
        dialogFooterButton={this._dialogFooterButton}
        closeLinkText="Cancel" />
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/archive_room_dialog/archive_room_dialog.js
 **/