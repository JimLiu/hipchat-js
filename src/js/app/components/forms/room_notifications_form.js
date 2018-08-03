import AuiFieldSet from 'components/common/aui/form/aui_form_fieldset';
import AuiRadio from 'components/common/aui/form/aui_radio';
import DialogActions from 'actions/dialog_actions';
import strings from 'strings/forms_strings';
import dialogStrings from 'strings/dialog_strings';
import PreferencesStore from 'stores/preferences_store';
import CurrentUserStore from 'stores/current_user_store';
import AnalyticsActions from 'actions/analytics_actions';

module.exports = React.createClass({

  displayName: "RoomNotificationsForm",

  getInitialState() {
    return this._getState();
  },

  _getNotificationSettings() {
    return _.get(PreferencesStore.getRoomNotificationOverrides(), this.props.jid, {});
  },

  _saveNotificationSettings(newSettings) {
    // if they set it back to the global settings, let's remove the override
    // otherwise let's save their overriden settings
    if(newSettings.level === "global") {
      PreferencesStore.removeRoomNotificationOverride(this.props.jid);
    } else {
      // save it to the server
      PreferencesStore.overrideNotificationForRoom(this.props.jid, newSettings);
    }
  },

  /**
   * This function exists to help us understand how to properly keep the two sets of radios
   * properly sync'd up.
   */
  _getSelection(event) {
    var targetId = _.get(event, "target.id", "notif-global"),
        retVal = {
          is_overridden: true
        };

    switch(targetId) {
      case "notif-loud":
        retVal.level = "loud";
        break;
      case "notif-normal":
        retVal.level = "normal";
        break;
      case "notif-quiet":
        retVal.level = "quiet";
        break;
      case "notif-custom":
        retVal.level = this.state.global_setting;
        break;
      case "notif-global":
        retVal.level = "global";
        retVal.is_overridden = false;
        break;
    }

    return retVal;
  },

  _onChange(event) {
    var inputInfo = this._getSelection(event);

    // if they've actually changed the value, or if they've changed between global and custom, fire an analytics event
    if(this.state.level !== inputInfo.level || this.state.is_overridden !== inputInfo.is_overridden) {
      AnalyticsActions.roomNotificationLevelChanged(this.state.level, inputInfo.level);
    }
    var newVal = _.merge({}, this._getState(), {level: inputInfo.level, is_overridden: inputInfo.is_overridden});
    this.setState(newVal);
    this._saveNotificationSettings({level: inputInfo.level});
  },

  _getState() {
    var global_setting = PreferencesStore.getGlobalNotificationSetting();
    var settings = this._getNotificationSettings(),
        notification_level = _.get(settings, "level", "global"),
        is_overridden = notification_level !== "global";

    return {
      mention: CurrentUserStore.get('mention') || '',
      global_setting: global_setting,
      level: notification_level,
      is_overridden: is_overridden
    };
  },

  _showSettingsDialog() {
    DialogActions.showSettingDialog({activeTab: dialogStrings.notifications});
  },

  _closeDialog() {
    DialogActions.closeDialog();
  },

  _getDefaultLabelDecoration() {
    var levelIcon = `icon-volume-${this.state.global_setting}`;
    var levelLabel = strings.label[this.state.global_setting];
    var classNames = `aui-icon hipchat-icon-small global ${levelIcon}`;

    return (
      <span>
        <span className={classNames}>{levelLabel}</span>
        <span className="global-level-label">{levelLabel}</span>
      </span>
    );
  },

  render() {
    var defaultLabelDecoration = this._getDefaultLabelDecoration();
    return (
      <div>
        <div className="heading">
          <span className="prefix">{strings.description.notif_header_prefix}</span>
          <span className="room-name" title={this.props.room_name}>{this.props.room_name}</span>
          <div className="settings-info">
            {strings.description.notif_settings_info_prefix}
            <a onClick={this._showSettingsDialog}>{strings.description.notif_settings_link}</a>
            {strings.description.notif_settings_info_suffix}
          </div>
        </div>
        <form id="room-notifications-form" ref="form" className="aui" onChange={this._onChange}>
          <AuiFieldSet ref="global">
            {defaultLabelDecoration}
            <AuiRadio id="notif-global"
                      name="override"
                      className="notif-global-radio"
                      defaultChecked={this.state.level === "global"}
                      checked={!this.state.is_overridden}
                      value="global"
                      label={strings.label.default_text} />
            <AuiRadio id="notif-custom"
                      name="override"
                      defaultChecked={this.state.is_overridden}
                      checked={this.state.is_overridden}
                      value="custom"
                      label={strings.label.custom} />
          </AuiFieldSet>
          <AuiFieldSet ref="override-opts" className="override-opts">
            <AuiRadio id="notif-loud"
                      name="notification"
                      defaultChecked={this.state.level === "loud"}
                      checked={this.state.is_overridden && this.state.level === "loud"}
                      value="loud" label={strings.label.loud}
                      icon="volume-loud"
                      description={strings.description.notif_loud} />
            <AuiRadio id="notif-normal"
                      name="notification"
                      defaultChecked={this.state.level === "normal"}
                      checked={this.state.is_overridden && this.state.level === "normal"}
                      value="normal" label={strings.label.normal}
                      icon="volume-normal"
                      description={strings.description.notif_normal(this.state.mention)} />
            <AuiRadio id="notif-quiet"
                      name="notification"
                      defaultChecked={this.state.level === "quiet"}
                      checked={this.state.is_overridden && this.state.level === "quiet"}
                      value="quiet" label={strings.label.quiet}
                      icon="volume-quiet"
                      description={strings.description.notif_quiet(this.state.mention)} />
          </AuiFieldSet>
        </form>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/room_notifications_form.js
 **/