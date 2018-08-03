import AppHeaderActions from 'actions/app_header_actions';
import strings from 'strings/notification_banner_strings';
import AppDispatcher from 'dispatchers/app_dispatcher';
import appConfig from 'config/app_config';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: "NotificationBanner",

  mixins: [PureRenderMixin],

  propTypes: {
    ready: React.PropTypes.bool.isRequired,
    notification_permission: React.PropTypes.bool.isRequired,
    notification_preference: React.PropTypes.bool.isRequired,
    notification_dismissed: React.PropTypes.oneOfType([
      React.PropTypes.bool,
      React.PropTypes.number
    ]).isRequired
  },

  getInitialState (){
    return {
      dismissed: false
    };
  },

  componentDidMount(){
    if (this.props.notification_preference && !this.props.notification_permission) {
      this._updateBannerState(true);
    }
  },

  componentWillReceiveProps (nextProps) {

    if (this.state.dismissed){
      return;
    }

    if (!this.props.notification_preference && nextProps.notification_preference) {
         this._updateBannerState(true);
    } else if (this.props.notification_preference && !nextProps.notification_preference) {
         this._updateBannerState(false);
    }
  },

  render () {
    return (
      <div className="aui-banner hc-banner-warning" role="banner" aria-hidden="false">{strings.banner_message}&nbsp;
        <a onClick={this._enableNotifications} ref="enable_btn" className="enable">{strings.enable_link}</a> {this.props.notification_dismissed > 0 ? strings.seriously_recommended : strings.recommended}
        <strong>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</strong>
        <a onClick={this._dismiss} ref="dismiss_btn">{strings.dismiss_link}</a>
          {
            this.props.notification_dismissed > 0 ? <span>
              <strong>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</strong>
              <a onClick={this._dismissForever} ref="dismiss_forever_btn">{strings.dismiss_forever_link}</a>
            </span> : <span></span>
            }
      </div>
    );
  },

  _updateBannerState (shown){
    _.delay(() => {
      AppDispatcher.dispatch('position-app-header-dialogs');
      AppDispatcher.dispatch('notification-banner-status', {shown: shown});
    }, appConfig.notification_banner_slide);
  },

  _enableNotifications () {
    this._hideBanner();
    AppHeaderActions.requestNotificationPermission();
  },

  _dismiss () {
    this._hideBanner();
    AppHeaderActions.dismissNotificationBanner();
  },

  _dismissForever () {
    this._hideBanner();
    AppHeaderActions.dismissNotificationBannerForever();
  },

  _hideBanner () {
    this.setState({
      dismissed: true
    });
    AppDispatcher.dispatch('notification-banner-status', {
      shown: false
    });
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/notification_banner.js
 **/