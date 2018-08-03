import PureRenderMixin from 'react-addons-pure-render-mixin';
import AnalyticsActions from 'actions/analytics_actions';
import DialogActions from 'actions/dialog_actions';
import CommonStrings from 'strings/common_strings';
import AnalyticsKeys from 'keys/analytics_keys';

export default React.createClass({

  displayName: "InviteUsersNavItem",

  mixins: [PureRenderMixin],

  _onClick: function () {
    DialogActions.showInviteTeammatesDialog({type: AnalyticsKeys.LEFT});
    AnalyticsActions.inviteTeamClickedEvent("left.navigation");
  },

  render: function() {
    return (
      <li className="hc-tab hc-add-item-link hc-invite-users-link">
        <a ref="link" className="aui-nav-item aui-inline-dialog-trigger" onClick={this._onClick}>
          <span className="aui-icon aui-icon-small aui-iconfont-add-small"></span>
          <span className="room-name">{CommonStrings.buttons.invite_team}</span>
        </a>
      </li>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/invite_users_nav_item.js
 **/