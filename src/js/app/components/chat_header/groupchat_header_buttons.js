import strings from 'strings/chat_header_strings';
import ChatHeaderActions from 'actions/chat_header_actions';
import ChatHeaderStrings from 'strings/chat_header_strings';
import GroupChatRoomDropDown from './groupchat_room_dropdown';
import NotificationIcon from './notification_icon';
import AUIDropdown from 'components/common/aui/dropdown2/aui_dropdown2';
import AUIDropdownTrigger from 'components/common/aui/dropdown2/aui_dropdown2_trigger';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import utils from 'helpers/utils';
import cx from 'classnames';

const PropTypes = React.PropTypes;

export default React.createClass({

  displayName: "GroupChatHeaderButtons",

  mixins: [PureRenderMixin],

  propTypes: {
    jid: PropTypes.string,
    name: PropTypes.string,
    guest_url: PropTypes.string,
    room_id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    privacy: PropTypes.string,
    type: PropTypes.string,
    active_panel: PropTypes.string,
    is_guest: PropTypes.bool,
    show_sidebar: PropTypes.bool,
    read_only_mode: PropTypes.bool,
    user_is_admin: PropTypes.bool,
    per_room_notifications_enabled: PropTypes.bool,
    can_create_room: PropTypes.bool,
    can_view_guest_access: PropTypes.bool,
    can_toggle_guest_access: PropTypes.bool,
    can_manage_room_integrations: PropTypes.bool,
    web_client_integrations_enabled: PropTypes.bool,
    web_client_enso_video_enabled: PropTypes.bool,
    web_client_enso_room_video_enabled: PropTypes.bool,
    show_integrations_warning_icon: React.PropTypes.bool
  },

  _startEnsoRoomVideo: function () {
    ChatHeaderActions.startEnsoRoomVideo({
      jid: this.props.jid,
      room_id: this.props.room_id,
      name: this.props.name
    });
  },

  _selectPanel: function(type) {
    this._clearButtonFocus();
    ChatHeaderActions.handlePanelSelect({
      type: type,
      room: this.props.jid
    });
  },

  _clearButtonFocus: function () {
    var buttons = ReactDOM.findDOMNode(this).querySelectorAll(".aui-button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].blur();
    }
  },

  _getDropDown() {
    return (
      <AUIDropdown className="aui-dropdown2-in-header" dropdownID="room-actions-drop-down">
        <GroupChatRoomDropDown {...this.props } />
      </AUIDropdown>
    );
  },

  _getActionsButton: function () {
    let classNames = cx({
      'aui-button': true,
      'aui-button-light': true,
      'notification-badge': this.props.show_integrations_warning_icon
    });

    return (
      <AUIDropdownTrigger
        id="room-actions-btn"
        dropdownID="room-actions-drop-down"
        className={classNames}
        arrowless={true}
        aria-label={strings.room_actions}>
          <span className="aui-icon aui-icon-small aui-iconfont-more">{strings.room_actions}</span>
      </AUIDropdownTrigger>
    );
  },

  _getNotificationIcon: function () {
    return (this.props.per_room_notifications_enabled && !this.props.is_guest) ? <NotificationIcon jid={this.props.jid} room_name={this.props.name} /> : null;
  },

  _getVideoButton: function () {
    let is_archived = utils.room.is_archived(this.props);
    let is_disabled = is_archived || this.props.read_only_mode;

    if (!this.props.web_client_enso_video_enabled || !this.props.web_client_enso_room_video_enabled || this.props.is_guest) {
      return null;
    }

    return <button
      ref='video_btn'
      className='hc-video-call-btn-link aui-button aui-button-light'
      title={ChatHeaderStrings.video_call}
      onClick={this._startEnsoRoomVideo}
      disabled={is_disabled}
      data-no-focus>
        <span className='aui-icon hipchat-icon-small icon-camera-no-slash'>{ChatHeaderStrings.video_call}</span>
    </button>;
  },

  _getButtonTitle: function(ref, tooltip) {
    if(this.props.show_sidebar && this.props.active_panel === ref) {
      return strings[`hide_${tooltip}`];
    }

    return strings[`show_${tooltip}`];
  },

  _renderButton: function(tooltip, ref, icons) {
    var active = (this.props.active_panel === ref && this.props.show_sidebar) ? 'active' : '';
    var title = this._getButtonTitle(ref, tooltip);
    return (
      <button ref={`${ref}_btn`} className={`hc-${ref}-btn-link aui-button aui-button-light ${active}`}
              onClick={this._selectPanel.bind(null, ref)}
              aria-label={title}>
        <span className={"aui-icon " + icons}>{strings[ref]}</span>
      </button>
    );
  },

  _getWebClientIntegrationsButtons: function(){
    var notificationIcon = this._getNotificationIcon(),
        videoButton = this.props.video_enabled ? this._getVideoButton() : null,
        sidePanelButton = this._renderButton("sidebar", "integrations", "hipchat-icon-small icon-integrations"),
        actionsButton = (this.props.is_guest) ? false : this._getActionsButton();

    return (
      <div>
        {notificationIcon}
        <div className="aui-buttons">
          {videoButton}
        </div>
        <div className="aui-buttons">
          {sidePanelButton}
          {actionsButton}
          </div>
      </div>
    );
  },

  _getButtons: function(){
    var notificationIcon = this._getNotificationIcon(),
        videoButton = this._getVideoButton(),
        rosterButton = this._renderButton("roster", "roster", "aui-icon-small aui-iconfont-user"),
        filesButton = this._renderButton("files", "files", "hipchat-icon-small icon-file"),
        linksButton = this._renderButton("links", "links", "hipchat-icon-small icon-link"),
        actionsButton = (this.props.is_guest) ? false : this._getActionsButton();

    return (
      <div>
        {notificationIcon}
        <div className="aui-buttons">
          {videoButton}
        </div>
        <div className="aui-buttons">
          {rosterButton}
          {filesButton}
          {linksButton}
        </div>
        <div className="aui-buttons">
          {actionsButton}
        </div>
      </div>
    );

  },

  render: function () {
    var classNames = cx({
      'aui-page-header-actions': true,
      'hc-chat-header-actions': true,
      'hc-integrations-chat-header-actions': this.props.web_client_integrations_enabled
    });

    var dropDown = (this.props.is_guest) ? false : this._getDropDown(),
        buttons = this.props.web_client_integrations_enabled ? this._getWebClientIntegrationsButtons() : this._getButtons();

    return (
      <div className={classNames} ref="actions">
        {buttons}
        {dropDown}
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/groupchat_header_buttons.js
 **/