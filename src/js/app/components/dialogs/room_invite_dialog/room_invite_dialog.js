var ModalDialog = require("components/common/modal_dialog/modal_dialog"),
    AppDispatcher = require("dispatchers/app_dispatcher"),
    strings = require('strings/dialog_strings'),
    DialogActions = require("actions/dialog_actions");

import linkify from 'helpers/linkify';
import utils from 'helpers/utils';

module.exports = React.createClass({

  displayName: "RoomInviteDialog",

  _dialogBody: function () {
    var invitePrompt = strings.invited_to_join(this.props.from_user, this.props.room_name);
    return (
      <div>{invitePrompt}<br /><br /><span dangerouslySetInnerHTML={this._getReasonHTML()}></span></div>
    );
  },

  _getReasonHTML() {
    let linkifyConfig = {
      truncate_length: 50
    };

    if (this.props.reason) {
      let reason = linkify.linkify(utils.escape(this.props.reason), undefined, linkifyConfig);

      return {
        __html: `"${reason}"`
      };
    }

    return {
      __html: ''
    };
  },

  _dialogFooterButton: function () {
    return (
      <button onClick={this._acceptInvite} className="aui-button aui-button-primary">{strings.join}</button>
    );
  },

  _acceptInvite: function (e) {
    e.preventDefault();
    AppDispatcher.dispatch('groupchat-invite-accepted', {
      jid: this.props.room_jid
    });
    DialogActions.closeDialog();
  },

  render: function () {
    return (
      <ModalDialog dialogId="room-invite-dialog"
        title={strings.join_room(this.props.room_name)}
        dialogBody={this._dialogBody}
        dialogFooterButton={this._dialogFooterButton}
        closeLinkText="Ignore"
        size="small"/>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/room_invite_dialog/room_invite_dialog.js
 **/