import AuiFieldSet from "components/common/aui/form/aui_form_fieldset";
import AuiRadio from "components/common/aui/form/aui_radio";
import DialogActions from "actions/dialog_actions";
import formsStrings from 'strings/forms_strings';
import dialogStrings from 'strings/dialog_strings';
import PreferencesStore from "stores/preferences_store";
import CurrentUserStore from "stores/current_user_store";
import AnalyticsActions from 'actions/analytics_actions';

module.exports = React.createClass({

  displayName: "RoomNotificationsForm",

  getInitialState: function () {
    return this._getState();
  },

  _getNotificationSettings: function() {
    return {
      level: PreferencesStore.getGlobalNotificationSetting()
    };
  },

  _saveNotificationSettings: function(newSettings) {
    PreferencesStore.setGlobalNotificationSetting(newSettings.level);
  },

  _onChange: function(event){
    var newValue = event.target.value.trim();

    // if they've actually changed the value, fire an analytics event
    if(this.state.level !== newValue) {
      AnalyticsActions.globalNotificationLevelChanged(this.state.level, newValue);
    }
    this.setState({ level: newValue });
    this._saveNotificationSettings({level: newValue});
  },

  _getState: function(){
    var settings = this._getNotificationSettings(),
        notification_level = _.get(settings, "level", "global");
    return {
      mention: CurrentUserStore.get('mention') || '',
      level: notification_level
    };
  },

  _showSettingsDialog: function () {
    DialogActions.showSettingDialog();
  },

  _closeDialog: function () {
    DialogActions.closeDialog();
  },

  render: function () {
    return (
      <form id="room-notifications-form" ref="form" className="aui per-room-notifs" onChange={this._onChange}>
        <h3>{dialogStrings.notify_rooms_header}</h3>
        <AuiFieldSet ref="override-opts">
          <AuiRadio id="notif-loud"
                    name="notification"
                    defaultChecked={this.state.level === "loud"}
                    value="loud"
                    icon="volume-loud"
                    label={formsStrings.label.loud}
                    description={formsStrings.description.notif_loud} />
          <AuiRadio id="notif-normal"
                    name="notification"
                    defaultChecked={this.state.level === "normal"}
                    value="normal"
                    icon="volume-normal"
                    label={formsStrings.label.normal}
                    description={formsStrings.description.notif_normal(this.state.mention)} />
          <AuiRadio id="notif-quiet"
                    name="notification"
                    defaultChecked={this.state.level === "quiet"}
                    value="quiet"
                    icon="volume-quiet"
                    label={formsStrings.label.quiet}
                    description={formsStrings.description.notif_quiet(this.state.mention)} />
        </AuiFieldSet>
      </form>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/global_room_notifications_form.js
 **/