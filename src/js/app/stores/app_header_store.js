import Store from "lib/core/store";
import DALCache from 'core/dal.cache';
import AppDispatcher from "dispatchers/app_dispatcher";
import AppConfig from 'config/app_config';
import PreferencesStore from 'stores/preferences_store';

class AppHeaderStore extends Store {

  getDefaults(){
    return {
      ready: false,
      active_chat: false,
      search_text: '',
      focus_search: false,
      notification_supported: typeof Notification !== 'undefined',
      notification_dismissed: null,
      notification_dismissed_forever: null,
      notification_preference: false,
      notification_permission: false,
      user_is_admin: false,
      invite_url: false,
      feature_flags: {},
      web_server: AppConfig.default_web_server,
      banner_shown: false,
      client_subtype: false
    };
  }

  registerListeners() {
    AppDispatcher.registerOnce({
      'DAL:cache-configured': () => {
        Promise.all([
          DALCache.get(DALCache.Keys.NOTIF_BANNER_DISMISSAL_COUNT),
          DALCache.get(DALCache.Keys.NOTIF_BANNER_DISMISSED_FOREVER)
        ]).then((cached) => {
          this.set({
            notification_dismissed: cached[0],
            notification_dismissed_forever: cached[1]
          });
        });
      },
      'app-state-ready': () => {
        this.set({
          ready: true
        });
      },
      'hc-init': (data) => {
        this.handleConfig(data);
      }
    });
    AppDispatcher.register({
      'updated:config': (config) => {
        this.handleConfig(config);
      },
      'updated:client_subtype': (client_subtype) => {
        if (client_subtype) {
          this.set({
            client_subtype: client_subtype
          });
        }
      },
      'updated:active_chat': (jid) => {
        this.set({
          active_chat: jid
        });
      },
      'updated:preferences': () => {
        this.set({
          notification_preference: PreferencesStore.getShowToasters(),
          should_animate_avatar: PreferencesStore.shouldAnimateAvatars()
        });
      },
      'updated:web_server': (web_server) => {
        this.set("web_server", web_server);
      },
      'search-history': (data) => {
        this.handleSearch(data);
      },
      'search-history-externally': (data) => {
        this.handleSearch(data);
      },
      'set-search-text': (data) => {
        this.set('search_text', data.text);
      },
      'request-notification-permission': () => {
        Notification.requestPermission();
      },
      'dismiss-notification-banner': () => {
        this.getDismissalCount().then((val) => {
          let count = val ? val + 1 : 1;
          DALCache.set(DALCache.Keys.NOTIF_BANNER_DISMISSAL_COUNT, count);
        });
      },
      'dismiss-notification-banner-forever': () => {
        DALCache.set(DALCache.Keys.NOTIF_BANNER_DISMISSED_FOREVER, true);
      },
      'focus-search': () => {
        this.set('focus_search', true);
      },
      'blur-search': () => {
        this.set('focus_search', false);
      },
      'notification-banner-status': (data) => {
        this.set('banner_shown', data.shown);
      }
    });
  }

  handleConfig(config) {
    this.set({
      user_is_admin: _.get(config, "is_admin", false),
      invite_url: _.get(config, "invite_url", false),
      feature_flags: _.get(config, "feature_flags", {})
    });
  }

  handleSearch() {
    this.set('search_text', '');
  }

  getDismissalCount() {
    return DALCache.get(DALCache.Keys.NOTIF_BANNER_DISMISSAL_COUNT);
  }
}

export default new AppHeaderStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/app_header_store.js
 **/