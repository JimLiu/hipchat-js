var PreferencesStore = require('stores/preferences_store');
var PrefKeys = require('keys/preferences_keys');
var strings = require('strings/room_notification_icon');
var DialogActions = require("actions/dialog_actions");
var AnalyticsActions = require('actions/analytics_actions');
var ApplicationStore = require('stores/application_store');

module.exports = React.createClass({

  displayName: "NotificationIcon",

  getInitialState: function() {
    return this._getState();
  },

  componentDidMount: function(){
    PreferencesStore.on([`change:${PrefKeys.ROOM_NOTIFICATION_OVERRIDES}`], this._onChange);
    PreferencesStore.on([`change:${PrefKeys.GLOBAL_NOTIFICATION_SETTING}`], this._onChange);
    ApplicationStore.on(['change:active_chat'], this._onChange);
    this._createTooltip();
  },

  componentWillUnmount: function(){
    PreferencesStore.off([`change:${PrefKeys.ROOM_NOTIFICATION_OVERRIDES}`], this._onChange);
    PreferencesStore.off([`change:${PrefKeys.GLOBAL_NOTIFICATION_SETTING}`], this._onChange);
    ApplicationStore.off(['change:active_chat'], this._onChange);
    this._destroyTooltip();
  },

  componentDidUpdate: function () {
    this._destroyTooltip();
    this._createTooltip();
  },

  _onChange: function(){
    if (this.isMounted()){
      this.setState(this._getState());
    }
  },

  _getState: function () {
    var jid = ApplicationStore.get('active_chat'),
        overrides = _.get(PreferencesStore.getRoomNotificationOverrides(), jid),
        level = _.get(overrides, `level`, PreferencesStore.getGlobalNotificationSetting());
    return { level };
  },

  _launchRoomNotificationsDialog: function() {
    DialogActions.showRoomNotificationsDialog({
      jid: ApplicationStore.get('active_chat'),
      room_name: this.props.room_name
    });
    AnalyticsActions.roomNotificationIconClicked();
  },

  _getIcon: function () {
    var levelIcon = `icon-volume-${this.state.level}`;
    var classNames = `aui-icon hipchat-icon-small ${levelIcon}`;
    var title = `${strings.level_prefix}${strings.level[this.state.level]}`;
    return (
      <div ref="notif_icon" className="hc-room-notif-icon" onClick={this._launchRoomNotificationsDialog}>
        <span className={classNames} aria-label={title} ref="icon" />
      </div>
    );
  },

  _createTooltip() {
    AJS.$(ReactDOM.findDOMNode(this.refs.icon)).tooltip({offset: 10});
  },

  _destroyTooltip() {
    AJS.$(ReactDOM.findDOMNode(this.refs.icon)).tooltip('destroy');
  },

  render: function() {
    return this._getIcon();
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/notification_icon.js
 **/