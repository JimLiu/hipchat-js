/*global Strophe HC_HOT_RELOAD*/

// Beginning of the application bootstrapping process before any client code has been executed. We're storing this
// moment in time for use in analytics event later when the analytics module is loaded.
// NOTE: We're checking for an existing value here to allow the native clients to have the opportunity to set this
//       value to whatever their actual start time is, rather than when they load the code in the web view.
//       We will also set this value on the web side in the php layer so that we can get a better handle on the
//       true starting point (rather than here when the entire minified application script has loaded).
window.hc_client_launch_time = window.hc_client_launch_time || new Date().getTime();

import 'helpers/polyfills';
import 'helpers/event_logger'; //setup event handlers for logger before anything else
import logger from 'helpers/logger';
import mousePosition from 'helpers/mouse_position';

window.onerror = logger.error.bind(logger);

import AppDispatcher from 'dispatchers/app_dispatcher';
import Analytics from 'analytics/analytics';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import ApplicationStore from 'stores/application_store';
import AppHeaderStore from 'stores/app_header_store';
import appDispatcherEvents from './app-dispatcher-events';
import utils from 'helpers/utils';
import ConfigStore from 'stores/configuration_store';
import ConfigurationModel from 'models/configuration_model';
import notifier from 'helpers/notifier';
import spi from 'spi';
import HCGlobal from 'helpers/hc_global';
import MainLayout from 'components/layout/main_layout';
import GuestLayout from 'components/layout/guest_layout';
import ConnectionManager from 'core/xmpp/connection_manager';
import ClientType from 'lib/enum/client_type';
import ErrorDetect from 'helpers/error_detect';
import NetworkStatusHelper from 'helpers/network_status_helper';

// Modules not directly used but need to be imported.
import 'stores/video_chat_store';
import 'helpers/presence_subscription_helper';
import 'helpers/clipboard_helper';

/**
 * Create a new HipChatClient
 *
 * @param {Object}  config the configuration object for this client object instance
 * @param {String}  config.client_type='web' the type for this client (used for connection and analytics)
 * @param {String}  config.client_subtype='unknown' the subtype for this client (used for connection and analytics)
 * @param {String}  config.base_url='https://www.hipchat.com' the base url of the HipChat instance to connect to
 * @param {String}  config.client_version_id='0' the version identifier for this HipChat client
 * @param {String}  config.client_os_version_id='0' the version identifier for this OS (or browser)
 * @param {URL}     config.asset_base_uri='' the base uri for assets (images/sounds)
 * @param {boolean} config.is_guest=false if this user is a guest user
 * @param {boolean} config.html5_routing_enabled=true if HTML5 style routing should be used, or hash based
 * @param {Object}  config.keyboard_shortcuts shortcuts object
 * @param {Object}  config.app_config_overrides any overrides for the application config that this client uses
 * @param {Object}  config.release_dialog_content {"title": "Title", "intro": "Intro", "bullets": ["Bullet1", "Bullet2"], "outro": "Outro", "cta": "Call to Action"}
 * @param {Object}  config.keyboard_shortcuts["ctrl+n"] {"action": "newChat"}
 * available default actions "newChat", "inviteUsersToRoom", "closeRoom", "navigateRoomsUp", "navigateRoomsDown",
 * "searchHistory", "toggleSoundNotifications", "viewShortcuts" - "action" can also accept a function:
 * {"action": function()(alert("hey"))} - optionally add a title {"title": "New chat", "action": "newChat"}
 * note: titles are automatically create for the default actions. If you pass a function you should pass a title.
 *
 * @returns {Object} a HipChatClient
 */

function HipChatClient(opts) {
  var defaultConfig = {
    base_url: '',
    video_base_url: 'https://hipchat.com/video/join',
    client_type: ClientType.WEB,
    client_os_version_id: 'unknown os version',
    client_version_id: '0',
    asset_base_uri: '',
    video_chat_uri: '',
    is_guest: false,
    read_only_mode: false,
    read_only_input_markdown: '',
    html5_routing_enabled: true,
    health_check_enabled: true,
    keyboard_shortcuts: null,
    app_config_overrides: {},
    native_feature_flags: {},
    release_dialog_content: {},
    ui: {}
  };

  // Set native_feature_flags if client is native
  // and feature_flags have been passed in
  if (utils.clientSubType.isNative(opts.client_subtype)) {
    opts.native_feature_flags = _.clone(opts.feature_flags);
  }

  var initState = opts.initState || {};
  delete opts.initState;

  let normalizedOpts = _.defaultsDeep(opts, defaultConfig);
  let mergedOpts = _.merge(normalizedOpts, initState);
  let config = new ConfigurationModel(mergedOpts);

  ApplicationStore.configure({
    config: config,
    asset_base_uri: config.asset_base_uri,
    client_type: config.client_type,
    video_chat_uri: config.video_chat_uri,
    client_subtype: config.client_subtype,
    client_version_id: config.client_version_id,
    html5_routing_enabled: config.html5_routing_enabled,
    release_dialog_content: config.release_dialog_content
  });

  // TODO: Get this into a spi. This is a temporary stop-gap
  ConnectionManager.setOAuthTokenCallback(initState.onRefreshOAuthAccessToken);

  logger.debug("[HipChatClient]", 'config received', logger.sanitize(ConfigStore.getAll()));

  AppHeaderStore.set({
    notification_permission: spi.getNotificationPermission()
  });

  NetworkStatusHelper.initialize({
    doHealthCheck: !!config.health_check_enabled
  });

  // Setup HC global
  window.HC = new HCGlobal({is_guest: config.is_guest});

  // Let's inform everyone else that the global is available
  $(document).trigger("hc-ready", window.HC);

  notifier.initialize(config.asset_base_uri, config.app_config_overrides);
  utils.emoticons.asset_base_uri = config.asset_base_uri;
  utils.emoticons.web_server = config.web_server;

  if (config.smileys) {
    utils.emoticons.addSmileys(config.smileys);
  }

  var clientIdentifier = {
    client_type: config.client_type,
    client_subtype: config.client_subtype,
    client_version_id: config.client_version_id,
    client_os_version_id: config.client_os_version_id
  };

  // disable analytics for btf:
  // this could potentially be an issue if
  // wrappers stop passing in the btf flag
  if (!_.get(config, 'feature_flags.btf')) {
    new Analytics(initState, clientIdentifier);
  }

  AnalyticsDispatcher.dispatch("analytics-hc-client-start");

  appDispatcherEvents(config);
  AppDispatcher.dispatch('hipchat-client-configured');

  var detector = new ErrorDetect((type, err) => {
    spi.onUnrecoverableError(type, err);
  });

  detector.addRule('invariant', {
    detect: err => { return err.name === "Invariant Violation" || /^Invariant Violation/.test(err.message); },
    threshold: 3,
    time: 5 * 1000
  });
  detector.install();
  mousePosition.track();
}
/**
 * Render the HipChatClient to the DOM
 * @param el an options element to render to, or an element matching #hipchat is used
 */
HipChatClient.prototype.render = function (el) {
  var targetEl = el || document.querySelector('#hipchat');

  // Determine which layout to use
  var Layout = ConfigStore.isGuest() ? GuestLayout : MainLayout;

  // Don't hold up rendering for data
  var rootInstance = ReactDOM.render(<Layout is_guest={ConfigStore.isGuest()} />, targetEl);

  if (module.hot && HC_HOT_RELOAD) {
    require('react-hot-loader/Injection').RootInstanceProvider.injectProvider({
      getRootInstances: function () {
        // Help React Hot Loader figure out the root component instances on the page:
        return [rootInstance];
      }
    });
  }

  $(window)
    .on('beforeunload', () => {
      AppDispatcher.dispatch('unload-app');
    })
    .blur(() => {
      AppDispatcher.dispatch('application-blurred');
    })
    .focus(() => {
      AppDispatcher.dispatch('application-focused');
    });

};

module.exports = HipChatClient;



/** WEBPACK FOOTER **
 ** ./src/js/app/hipchat-client/client.js
 **/