import ModalDialog from "components/common/modal_dialog/modal_dialog";
import RoomsNavStore from "stores/rooms_nav_store";
import DialogActions from "actions/dialog_actions";
import FlagActions from "actions/flag_actions";
import strings from 'strings/dialog_strings';
import RoomDropDownActions from "actions/room_dropdown_actions";
import DialogVisibilityMixin from 'components/mixins/modal_dialog_visibility_mixin';

export default React.createClass({

  displayName: "GuestAccessDialog",

  mixins: [DialogVisibilityMixin],

  getInitialState: function () {
    return this._getActiveChatState();
  },

  _getActiveChatState: function () {
    return {
      active_chat: RoomsNavStore.get("active_chat"),
      rooms: RoomsNavStore.get("rooms")
    };
  },

  _dialogBody: function () {
    return (
      <div>
        <p><strong>{strings.really_disable_guest}</strong></p>
        <p>{strings.confirm_disable_guest}</p>
      </div>
    );
  },

  _dialogFooterButton: function () {
    return (
      <button onClick={this._onFooterButtonClicked} className="aui-button aui-button-primary" aria-disabled={this.state.btnLoading} disabled={this.state.btnLoading}>{strings.ok}</button>
    );
  },

  _onFooterButtonClicked: function(e) {
    e.preventDefault();
    this._disableGuestAccess();
  },

  _disableGuestAccess: function () {
    DialogActions.startBtnLoading();

    RoomDropDownActions.disableGuestAccess({
      jid: this.state.active_chat
    }, this._disableGuestCallback);
  },

  _disableGuestCallback: function (error) {
    if (error) {
      this._throwFlagError(error.message || strings.disable_guest_fail);
    }
    DialogActions.closeDialog();
  },

  _throwFlagError: function (errorMessage) {
    FlagActions.showFlag({
      type: "error",
      body: this._flagBody(errorMessage),
      close: "manual"
    });
  },

  _flagBody: function (errorMessage) {
    return () => (
      <div>
        <p className="hc-message-body">{errorMessage}</p>
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
    DialogActions.showDisableGuestAccessDialog();
  },

  render: function () {
    return (
      <ModalDialog dialogId="disable-guest-dialog"
        title={strings.disable_guest}
        dialogBody={this._dialogBody}
        dialogFooterButton={this._dialogFooterButton}
        btnLoading={this.state.btnLoading}
        closeLinkText={strings.cancel} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/guest_access_dialog/guest_access_dialog.js
 **/