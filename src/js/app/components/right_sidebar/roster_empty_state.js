import strings from 'strings/empty_state_strings';
import DialogActions from "actions/dialog_actions";
import AnalyticsActions from "actions/analytics_actions";
import AnalyticsKeys from 'keys/analytics_keys';

export default React.createClass({

  displayName: "RightSideBarRosterEmptyState",

  _openInviteUsers: function(e) {
    e.preventDefault();
    DialogActions.showInviteUsersDialog({type: AnalyticsKeys.RIGHT_SIDEBAR});
    AnalyticsActions.inviteUserToRoomClickedEvent("roster");
    AnalyticsActions.inviteToRoomRightSidebarClicked();
  },

  _openInviteTeam: function(e) {
    e.preventDefault();
    DialogActions.showInviteTeammatesDialog();
    AnalyticsActions.inviteTeamClickedEvent("roster");
  },

  _getInviteMessage: function () {
    var message;
    if (this.props.room_privacy === "private" && !this.props.isAdmin) {
      message = (
        <div>
          <div className="hc-tab-es-title">{strings.empty_private_room}</div>
        </div>
      );
    } else {
      var inviteAction,
          inviteMessage,
          inviteActionMessage;

      if (_.size(this.props.users) === 1 && (this.props.user_is_admin || this.props.invite_url)) {
        inviteAction = this._openInviteTeam;
        inviteMessage = strings.invite_to_team;
        inviteActionMessage = strings.invite_to_team_action;
      } else {
        inviteAction = this._openInviteUsers;
        inviteMessage = strings.invite_to_room;
        inviteActionMessage = strings.invite_to_room_action;
      }

      message = (
        <div>
          <div className="hc-tab-es-title">{inviteMessage}</div>
          <div className="hc-tab-es-msg">
            <a className="hc-tab-es-invite aui-inline-dialog-trigger" onClick={inviteAction}>{inviteActionMessage}</a>
          </div>
        </div>
      );
    }
    return message;
  },

  render: function(){
    var inviteMessage = this._getInviteMessage();
    return (
      <div className="hc-tab-es">
        <div className="hc-tab-es-img roster"></div>
        {inviteMessage}
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/roster_empty_state.js
 **/