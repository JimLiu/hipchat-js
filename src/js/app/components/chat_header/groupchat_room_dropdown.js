import DialogActions from 'actions/dialog_actions';
import AnalyticsActions from 'actions/analytics_actions';
import strings from 'strings/chat_header_strings';
import RoomDropDownActions from 'actions/room_dropdown_actions';
import utils from 'helpers/utils';
import ConfigStore from 'stores/configuration_store';
import DropdownInteractiveLink from 'components/common/aui/dropdown2/aui_dropdown2_interactive_link';
import AUISection from 'components/common/aui/dropdown2/aui_section';
import AnalyticsKeys from 'keys/analytics_keys';
import FlagActions from "actions/flag_actions";
import { enable_guest_fail as enableGuestFailString } from 'strings/dialog_strings';

export default React.createClass({

  displayName: 'RoomDropDown',

  propTypes: {
    jid: React.PropTypes.string,
    name: React.PropTypes.string,
    guest_url: React.PropTypes.string,
    room_id: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number
    ]),
    privacy: React.PropTypes.string,
    is_archived: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.bool
    ]),
    user_is_admin: React.PropTypes.bool,
    read_only_mode: React.PropTypes.bool,
    per_room_notifications_enabled: React.PropTypes.bool,
    can_view_guest_access: React.PropTypes.bool,
    can_toggle_guest_access: React.PropTypes.bool,
    can_manage_room_integrations: React.PropTypes.bool,
    show_integrations_warning_icon: React.PropTypes.bool
  },

  getInitialState() {
    return this._getState();
  },

  _getState() {
    return {
      user_id: ConfigStore.get('user_id'),
      web_server: ConfigStore.get('web_server')
    };
  },

  componentDidMount() {
    ConfigStore.on(['change:user_id', 'change:web_server'], this._onChange);
  },

  componentWillUnmount() {
    ConfigStore.off(['change:user_id', 'change:web_server'], this._onChange);
  },

  _onChange(){
    this.setState(this._getState());
  },

  // Event Listeners

  _onRoomNotificationsClick() {
    DialogActions.showRoomNotificationsDialog({
      jid: this.props.jid,
      room_name: this.props.name
    });
    AnalyticsActions.roomNotificationDropdownClicked();
  },

  _onArchiveRoomClick() {
    DialogActions.showArchiveRoomDialog({archive: true});
  },

  _onUnarchiveRoomClick() {
    DialogActions.showArchiveRoomDialog({archive: false});
  },

  _onInviteUserClick() {
    DialogActions.showInviteUsersDialog({type: AnalyticsKeys.ROOM_MENU});
    AnalyticsActions.roomMenuInviteClicked();
  },

  _onRemoveUserClick() {
    DialogActions.showRemoveUsersDialog();
  },

  _onChangeTopicClick() {
    RoomDropDownActions.editTopic();
  },

  _onChangePrivacyClick() {
    DialogActions.showRoomPrivacyDialog({
      jid: this.props.jid,
      name: this.props.name,
      privacy: this.props.privacy
    });
  },

  _onRenameRoomClick() {
    DialogActions.showRenameRoomDialog({
      jid: this.props.jid,
      name: this.props.name
    });
  },

  _onDeleteRoomClick() {
    DialogActions.showDeleteRoomDialog({
      jid: this.props.jid,
      room_id: this.props.room_id,
      name: this.props.name
    });
  },

  _onEnableGuestClick() {
    RoomDropDownActions.enableGuestAccess({jid: this.props.jid}, this._enableGuestCallback);
  },

  _enableGuestCallback: function (error) {
    if (error) {
      this._throwFlagError(error.message || enableGuestFailString);
    }
  },

  _throwFlagError: function (errorMessage) {
    FlagActions.showFlag({
      type: "error",
      body: errorMessage,
      close: "auto"
    });
  },

  _onDisableGuestClick: function () {
    DialogActions.showDisableGuestAccessDialog();
  },

  // Permission / State Validators

  _allowInviteUser() {
    return ((this.props.privacy === 'public' || this.props.privacy === 'private' && this.props.user_is_admin) && this._isNotArchived());
  },

  _allowRemoveUser() {
    return (this.props.privacy === 'private' && this.props.user_is_admin && this._isNotArchived());
  },

  _allowAdminOnUnarchived() {
    return this.props.user_is_admin && this._isNotArchived();
  },

  _allowConfigureIntegrations() {
    return this.props.can_manage_room_integrations && this._isNotArchived();
  },

  _isArchived() {
    return utils.room.is_archived({
      is_archived: this.props.is_archived
    });
  },

  _isNotArchived() {
    return !this._isArchived();
  },

  _archiveEnabled() {
    return this.props.user_is_admin && this._isNotArchived();
  },

  _unarchiveEnabled() {
    return this.props.user_is_admin && this._isArchived();
  },

  // Renderers

  render() {
    let inviteUserLink = this._renderLink(strings.invite_users, this._allowInviteUser, this._onInviteUserClick),
      removeUserLink = this._renderLink(strings.remove_users, this._allowRemoveUser, this._onRemoveUserClick),
      archiveRoomLink = this._renderLink(strings.archive, this._archiveEnabled, this._onArchiveRoomClick),
      unarchiveRoomLink = this._renderLink(strings.unarchive, this._unarchiveEnabled, this._onUnarchiveRoomClick),
      changeTopicLink = this._renderLink(strings.change_topic, this._isNotArchived, this._onChangeTopicClick),
      changePrivacyLink = this._renderLink(strings.change_privacy, this._allowAdminOnUnarchived, this._onChangePrivacyClick),
      deleteRoomLink = this._renderLink(strings.delete, this._allowAdminOnUnarchived, this._onDeleteRoomClick),
      renameRoomLink = this._renderLink(strings.rename, this._allowAdminOnUnarchived, this._onRenameRoomClick),
      roomNotificationsItem = (this.props.per_room_notifications_enabled) ? this._getRoomNotificationsItem() : false,
      integrationsItem = this._getIntegrationsItem(),
      canViewGuestAccess = this.props.can_view_guest_access,
      canToggleGuestAccess = this.props.can_toggle_guest_access;

    return (
      <div role="application" className="groupchat-room-dropdown">
        <AUISection>
          <ul role="list">
            { roomNotificationsItem }
            { integrationsItem }
          </ul>
        </AUISection>
        <AUISection>
          <ul role="list">
            <li className="invite-user-action" role="listitem">{ inviteUserLink }</li>
            <li className="remove-user-action" role="listitem">{ removeUserLink }</li>
          </ul>
        </AUISection>
        <AUISection>
          <ul role="list">
            <li className="enable-guest-action" role="listitem">
              <DropdownInteractiveLink
                type="radio"
                interactive={ false }
                checked={ !!this.props.guest_url && canViewGuestAccess }
                disabled={ !(canToggleGuestAccess && !this.props.guest_url) || this.props.read_only_mode }
                onCheck={ this._onEnableGuestClick }>
                  { strings.enable_guest }
              </DropdownInteractiveLink>
            </li>
            <li className="disable-guest-action" role="listitem">
              <DropdownInteractiveLink
                type="radio"
                interactive={ false }
                checked={ !this.props.guest_url && canViewGuestAccess }
                disabled={ !(canToggleGuestAccess && this.props.guest_url) || this.props.read_only_mode }
                onCheck={ this._onDisableGuestClick }>
                  { strings.disable_guest }
              </DropdownInteractiveLink>
            </li>
          </ul>
        </AUISection>
        <AUISection>
          <ul role="list">
            <li className="archive-room-action" role="listitem">{ archiveRoomLink }</li>
            <li className="unarchive-room-action" role="listitem">{ unarchiveRoomLink }</li>
            <li className="change-topic-action" role="listitem">{ changeTopicLink }</li>
            <li className="change-privacy-action" role="listitem">{ changePrivacyLink }</li>
            <li className="delete-room-action" role="listitem">{ deleteRoomLink }</li>
            <li className="rename-room-action" role="listitem">{ renameRoomLink }</li>
          </ul>
        </AUISection>
      </div>
    );
  },

  /**
   * Render an anchor link
   * @param {string} text. the content of the link. also used as the title attr
   * @param {function} validator. function to call to see if the link should be active.
   *   determines whether the link has a disabled class and aria-disabled attr
   * @param {function} callback. method to call when the link is clicked if it is not disabled
   */
  _renderLink (text, validator, callback) {
    let isAvailable = validator();
    let handler = () => {
      if (validator()) {
        callback();
      }
    };

    return (
      <a title={text}
         className={ isAvailable ? '' : 'disabled' }
         aria-disabled={ isAvailable ? 'false' : 'true' }
         onClick={ handler }>
        { text }
      </a>
    );
  },

  _getRoomNotificationsItem() {
    return (
      <li className="room-notifications" role="listitem">
        <a title={strings.room_notifications} onClick={this._onRoomNotificationsClick}>{strings.room_notifications}</a>
      </li>
    );
  },

  _onIntegrationsClick() {
    DialogActions.showIntegrationsManagementDialog({
      jid: this.props.jid,
      room_name: this.props.name
    });
    AnalyticsActions.roomIntegrationsDropdownClicked(this.props.show_integrations_warning_icon);
  },

  _getIntegrationsWarningIcon() {
    return (<span className="hc-integration-warning-icon aui-icon aui-icon-small aui-iconfont-warning" />);
  },

  _getIntegrationsItem() {
    let warningIcon = this.props.show_integrations_warning_icon ? this._getIntegrationsWarningIcon() : null;

    return (
      <li className="integrations-user-action" role="listitem">
        <a title={strings.integrations} onClick={this._onIntegrationsClick}>
          {strings.integrations}
          {warningIcon}
        </a>
      </li>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/groupchat_room_dropdown.js
 **/