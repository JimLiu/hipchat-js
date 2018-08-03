import ModalDialog from 'components/common/modal_dialog/modal_dialog';
import strings from 'strings/dialog_strings';
import RoomNotificationsForm from 'components/forms/room_notifications_form';
import ieSubmitMixin from 'components/mixins/ie_submit_mixin';

module.exports = React.createClass({

  displayName: "RoomNotificationsDialog",

  mixins: [ieSubmitMixin],

  _dialogBody: function () {
    return (
      <RoomNotificationsForm jid={this.props.jid} room_name={this.props.room_name} />
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="room-notifications-dialog"
        title={strings.room_notifications}
        size="small"
        dialogBody={this._dialogBody}
        noCloseLink={true} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/room_notifications_dialog/room_notifications_dialog.js
 **/