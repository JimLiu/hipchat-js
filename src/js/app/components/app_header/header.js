import UserStatus from "./user_status";
import AppActions from "actions/app_actions";
import AppHeaderStore from "stores/app_header_store";
import ReadOnlyStore from "stores/read_only_store";
import NotificationBanner from './notification_banner';
import DialogActions from 'actions/dialog_actions';
import AnalyticsActions from 'actions/analytics_actions';
import appHeaderStrings from 'strings/app_header_strings';
import commonStrings from 'strings/common_strings';
import utils from 'helpers/utils';
import cx from'classnames';
import AnalyticsKeys from 'keys/analytics_keys';

export default React.createClass({

  displayName: "AppHeader",

  getInitialState: function() {
    return this._getState();
  },

  _getState: function() {
    var state = _.assign({}, AppHeaderStore.getAll(), {
      read_only_mode: ReadOnlyStore.get('read_only_mode')
    });
    return state;
  },

  componentDidMount: function() {
    AppHeaderStore.on("change", this._onChange);
    ReadOnlyStore.on("change:read_only_mode", this._onChange);
  },

  componentWillUnmount: function() {
    AppHeaderStore.off("change", this._onChange);
    ReadOnlyStore.off("change:read_only_mode", this._onChange);
  },

  _onLogoClick: function() {
    AppActions.logoClicked();
  },

  _onNewChatClick: function(evt) {
    AnalyticsActions.newChatButtonClicked();
    DialogActions.showQuickSwitcherDialog();
    evt.preventDefault();
  },

  _getUserStatus: function() {
    if (this.state.ready) {
      return <UserStatus search_text={this.state.search_text}
                         focus_search={this.state.focus_search}
                         active_chat={this.state.active_chat}
                         multi_org_supported={this.state.feature_flags.web_client_subdomain_scoped_session}
                         search_enabled={this.state.feature_flags.web_client_embedded_search}
                         should_animate_avatar={this.state.should_animate_avatar}
                         read_only_mode={this.state.read_only_mode}
                         is_guest={this.props.is_guest} />;
    }
  },

  _getNewChatButton: function () {
    if (this.state.ready) {
      let newChatClasses = cx({
        'aui-button': true,
        'aui-button-primary': true,
        'is-native': utils.clientSubType.isNative(this.state.client_subtype)
      });

      return (
        <ul className="aui-nav" data-skate-ignore>
          <li>
            <a onClick={this._onNewChatClick} id="new_chat_btn" ref="new_chat_btn" className={newChatClasses} aria-label={appHeaderStrings.new_chat_btn_title} data-tipsify-ignore>{appHeaderStrings.new_chat_btn_title}</a>
          </li>
        </ul>
      );
    }
  },

  _getInviteUserButton: function () {
    if (!this.state.feature_flags.hide_invite_your_team_button) {
      if (this.state.ready && (this.state.user_is_admin || this.state.invite_url)) {
        return (
          <ul className="aui-nav" data-skate-ignore>
            <li>
              <a onClick={this._onInviteUserClick}
                 className="aui-button aui-button-link hc-invite-users aui-inline-dialog-trigger"
                 aria-label={appHeaderStrings.invite_your_team_btn_title}
                 data-tipsify-ignore>{appHeaderStrings.invite_your_team_btn_title}</a>
            </li>
          </ul>
        );
      }
    }
  },

  _getAppLogo: function() {
    return (
      <a id="app_logo" ref="app_logo" href={`https://${this.state.web_server}/home`} onClick={this._onLogoClick} target="_blank">
        <span className="aui-header-logo-device">{commonStrings.hipchat}</span>
      </a>
    );
  },

  _onInviteUserClick: function() {
    DialogActions.showInviteTeammatesDialog({type: AnalyticsKeys.TOP});
    AnalyticsActions.inviteTeamClickedEvent("top.navigation");
  },

  _onChange: function() {
    this.setState(this._getState());
  },

  render: function () {
    var hipchatLogo = !utils.clientSubType.isNative(this.state.client_subtype) ? this._getAppLogo() : false;
    var userStatus = this._getUserStatus();
    var newChatButton = (this.props.is_guest) ? false : this._getNewChatButton();
    var inviteUsersButton = (this.props.is_guest) ? false : this._getInviteUserButton();

    var banner;
    var show_banner = this.state.ready && this.state.notification_supported && !this.state.notification_dismissed_forever && !this.state.notification_permission;
    if (show_banner) {
      banner = <NotificationBanner {...this.state} />;
    }

    var classes = cx({
      'app-header': true,
      'banner-dismissed': !this.state.banner_shown,
      'banner-shown': this.state.banner_shown && show_banner
    });

    return (
      <header id="header" className={classes} role="banner">
        {banner}
        <nav className="aui-header aui-dropdown2-trigger-group" role="navigation" data-aui-responsive="true">
          <div className="aui-header-inner">
            <div className="aui-header-primary">
              <h1 id="logo" className="aui-header-logo aui-header-logo-hc">
                {hipchatLogo}
              </h1>
              {newChatButton}
              {inviteUsersButton}
            </div>
            {userStatus}
          </div>
        </nav>
      </header>

    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/header.js
 **/