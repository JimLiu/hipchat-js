var AuiCheckboxField = require("components/common/aui/form/aui_checkbox_field");
var PreferencesStore = require("stores/preferences_store");
var PreferencesKeys = require("keys/preferences_keys");
var ClientPreferencesKeys = require("keys/client_preferences_keys");
var AnalyticsActions = require("actions/analytics_actions");

module.exports = React.createClass({

  displayName: "PreferenceCheckboxField",

  getDefaultProps: function() {
    return {
      isReverse: false
    };
  },

  _isDefaultChecked: function() {
    var isChecked = PreferencesStore.get(this.props.id);

    if (this.props.isReverse) {
      isChecked = !isChecked;
    }

    return isChecked;
  },

  _handleAnalytics: function () {
    switch (this.props.id) {
      case ClientPreferencesKeys.HIDE_GIFS_BY_DEFAULT:
        this._handleGifsClicked();
        break;
      case PreferencesKeys.NOTIFY_FOR_PRIVATE_ROOM:
        this._handlePrivateRoomNotificationClicked();
        break;
      case PreferencesKeys.NOTIFY_FOR_ROOM:
        this._handleOpenRoomNotificationClicked();
        break;
    }
  },

  _handleGifsClicked: function () {
    var old_val = PreferencesStore.get(this.props.id),
        new_val = !old_val;
    AnalyticsActions.hideGifsClicked(old_val, new_val);
  },

  _handlePrivateRoomNotificationClicked: function () {
    var old_val = PreferencesStore.get(this.props.id),
        new_val = !old_val;
    AnalyticsActions.privateRoomNotificationClicked(old_val, new_val);
  },

  _handleOpenRoomNotificationClicked: function () {
    var old_val = PreferencesStore.get(this.props.id),
        new_val = !old_val;
    AnalyticsActions.openRoomNotificationClicked(old_val, new_val);
  },

  render: function() {
    return (
      <AuiCheckboxField {...this.props} onChange={this._handleAnalytics} defaultChecked={this._isDefaultChecked()} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/settings_dialog/preference_checkbox_field.js
 **/