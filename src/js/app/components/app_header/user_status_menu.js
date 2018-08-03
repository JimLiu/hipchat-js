import PresenceIcon from 'components/common/icon/presence-icon';
import strings from 'strings/app_header_strings';
import AppActions from 'actions/app_actions';
import AppHeaderActions from 'actions/app_header_actions';
import AnalyticsActions from 'actions/analytics_actions';
import CurrentUserActions from 'actions/current_user_actions';
import InlineDialogActions from 'actions/inline_dialog_actions';
import AUISection from 'components/common/aui/dropdown2/aui_section';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import Presence from 'lib/enum/presence';

export default React.createClass({

  displayName: "UserStatusMenu",

  mixins: [PureRenderMixin],

  propTypes: {
    web_server: React.PropTypes.string,
    is_guest: React.PropTypes.bool,
    multi_org_supported: React.PropTypes.bool,
    presence_show: React.PropTypes.string,
    presence_status: React.PropTypes.string
  },

  getDefaultProps: function () {
    return {
      active: true
    };
  },

  _onSignOut (){
    AppActions.signout();
  },

  _onSettingsClick () {
    AppHeaderActions.requestPreferencesDialog();
  },

  _onLogInToAnotherTeam () {
    AppActions.logInToAnotherTeam();
  },

  _onPresenceUpdate (e) {
    let show = e.currentTarget.getAttribute('data-show');
    CurrentUserActions.changeStatus({
      status: this.props.presence_status,
      show,
      type: 'show'
    });
    InlineDialogActions.showUserStatusMessage({
      anchor: document.getElementById('status_dropdown'),
      status: this.props.presence_status,
      show
    });
  },

  _shouldAllowLogIntoAnotherTeam: function () {
    return !this.props.is_guest && this.props.multi_org_supported;
  },

  _getSettings: function () {
    return (
      <li className="settings" role="listitem">
        <a id="hc-settings" onClick={this._onSettingsClick}>
          <span className="aui-icon aui-icon-small aui-iconfont-configure"></span> {strings.settings}
        </a>
      </li>
    );
  },

  _getLogIntoAnotherTeam: function () {
    return (
      <AUISection className="hc-actions">
        <ul role="list">
          <li className="login-to-another-team" role="listitem">
            <a id="hc-login-team" onClick={this._onLogInToAnotherTeam}>
              <span className="aui-icon aui-icon-small aui-iconfont-list-add"></span> {strings.log_in_to_another_team}
            </a>
          </li>
        </ul>
      </AUISection>
    );
  },

  _getProfileSection: function () {
    return (
      <AUISection>
        <ul role="list">
          <li role="listitem">
            <a onClick={this._onUserProfileClick} className="hc-user-name" href={`https://${this.props.web_server}/account`} target="_blank">{strings.profile}</a>
          </li>
        </ul>
      </AUISection>
    );
  },

  _onUserProfileClick(){
    AnalyticsActions.editProfileClicked();
  },

  render: function () {
    var settings = (this.props.is_guest) ? false : this._getSettings();
    var userProfileSection = (this.props.is_guest) ? null : this._getProfileSection();
    var loginToAnotherTeam = (this._shouldAllowLogIntoAnotherTeam()) ? this._getLogIntoAnotherTeam() : false;

    return (
      <div role="application">
        {userProfileSection}
        <AUISection className="hc-availability">
          <ul role="list">
            <li className="chat aui-inline-dialog-trigger" role="listitem">
              <a id="hc-avail" data-show={Presence.AVAILABLE} onClick={this._onPresenceUpdate}>
                <PresenceIcon
                  presence={Presence.AVAILABLE}
                  active={this.props.active} />
                {strings.available}
              </a>
            </li>
            <li className="xa aui-inline-dialog-trigger" role="listitem">
              <a id="hc-xa" data-show={Presence.AWAY} onClick={this._onPresenceUpdate}>
                <PresenceIcon
                  presence={Presence.AWAY}
                  active={this.props.active} />
                {strings.away}
              </a>
            </li>
            <li className="dnd aui-inline-dialog-trigger" role="listitem">
              <a id="hc-dnd" data-show={Presence.DND} onClick={this._onPresenceUpdate}>
                <PresenceIcon
                  presence={Presence.DND}
                  active={this.props.active} />
                {strings.dnd}
              </a>
            </li>
          </ul>
        </AUISection>
        <AUISection className="hc-actions">
          <ul role="list">
            {settings}
            <li className="signout" role="listitem">
              <a id="hc-signout" onClick={this._onSignOut}>
                <span className="aui-icon aui-icon-small aui-iconfont-devtools-checkout"></span> {strings.log_out}
              </a>
            </li>
          </ul>
        </AUISection>
        {loginToAnotherTeam}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/user_status_menu.js
 **/