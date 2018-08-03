var ModalDialog = require("components/common/modal_dialog/modal_dialog"),
    InviteUsersForm = require("components/forms/invite_user_form"),
    strings = require('strings/dialog_strings'),
    RoomsNavStore = require("stores/rooms_nav_store"),
    utils = require("helpers/utils"),
    ieSubmitMixin = require('components/mixins/ie_submit_mixin'),
    DialogVisibilityMixin = require('components/mixins/modal_dialog_visibility_mixin');

module.exports = React.createClass({

  displayName: "InviteUserDialog",

  mixins: [ieSubmitMixin, DialogVisibilityMixin],

  componentDidMount: function () {
    RoomsNavStore.on(['change'], this._onStoreChange);
  },

  componentWillUnmount: function () {
    RoomsNavStore.off(['change'], this._onStoreChange);
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

  _onStoreChange: function () {
    this.setState(this._getActiveChatState());
  },

  _dialogTitle: function () {
    return strings.invite_users(utils.room.get_room_name(_.keyBy(this.state.rooms.rooms, 'jid'), this.state.active_chat));
  },

  _dialogBody: function () {
    if (utils.jid.is_room(this.state.active_chat)) {
      let type = this.state.dialogData ? this.state.dialogData.type : false;
      return <InviteUsersForm type={type} dialogVisible={this.state.dialogVisible} room_jid={this.state.active_chat} invite_user_jids={this.props.invite_users}/>;
    }
  },

  _dialogFooterButton: function () {
    return (
      <button form="invite-users-form" className="aui-button aui-button-primary" type="submit" onClick={this.ieSubmit}>Invite people</button>
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="invite-users-dialog"
                   title={this._dialogTitle()}
                   dialogBody={this._dialogBody}
                   dialogFooterButton={this._dialogFooterButton}
                   closeLinkText="Cancel" />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/invite_user_dialog/invite_user_dialog.js
 **/