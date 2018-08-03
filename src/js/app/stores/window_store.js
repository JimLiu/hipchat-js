import Store from 'lib/core/store';
import AppStore from 'stores/application_store';
import PreferencesStore from 'stores/preferences_store';
import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from "dispatchers/analytics_dispatcher";
import router from '../routes';
import logger from 'helpers/logger';

class WindowStore extends Store {

  constructor() {
    super();

    this.router = router();
    this.data = {
      active_chat: '',
      initialized: false
    };
    this.throttledSelectRoom = _.throttle((data) => {
      this.setHash(data.jid);
    }, 100, {leading: true, trailing: false});
    this.registerCallbacks();
  }

  registerCallbacks() {
    AppDispatcher.registerOnce({
      'hc-init': () => {
        this.setBodyClasses();
      },
      'before:app-state-ready': () => {
        if (window.location.pathname === '/chat/search') {
          this.setHash(PreferencesStore.get('chatToFocus'));
        } else {
          this.router.route(window.location.pathname + window.location.search);
        }
        this.data.initialized = true;
      }
    });
    AppDispatcher.register({
      'set-route': (data) => {
        if (this.data.initialized && data.jid !== this.data.active_chat) {
          this.throttledSelectRoom(data);
        }
      },
      'set-multiple-routes': (data) => {
        if (this.data.initialized && data.jid !== this.data.active_chat) {
          this.setHash(data.jid);
        }
      },
      'updated:active_chat': (jid) => {
        this.data.active_chat = jid;
      },
      'updated:preferences': () => {
        this.setBodyClasses();
      }
    });
    // Only send window analytics once, after the first chat finishes loading
    // (at this point we can be sure that the window dimensions will be properly set)
    AnalyticsDispatcher.registerOnce({
      'analytics-history-loaded': (data) => {
        this.sendWindowAnalytics();
      },
    });
  }

  getAppDimensions() {
    let leftSidebarVisible = PreferencesStore.shouldShowNavigationSidebar();
    let leftSidebarWidth = (leftSidebarVisible ? PreferencesStore.getLeftColumnWidth() : 0);
    let rightSidebarVisible = PreferencesStore.shouldShowGroupChatSidebar();
    let rightSidebarWidth = (rightSidebarVisible ? PreferencesStore.getRightColumnWidth() : 0);

    return {
      leftSidebarWidth: leftSidebarWidth,
      rightSidebarWidth: rightSidebarWidth,
      chatPanelWidth: (window.innerWidth - leftSidebarWidth - rightSidebarWidth),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    };
  }

  sendWindowAnalytics() {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.app.dimensions",
      properties: this.getAppDimensions()
    });
  }

  setHash(jid) {
    var allRooms = AppStore.get("allRooms");
    var newPath = this.router.reverse(jid, allRooms);
    if (newPath !== window.location.pathname){
      try {
        this.router.route(newPath);
      } catch (err){
        logger.error(err);
        logger.type('router').error(err);
      }
    }
  }

  setBodyClasses() {
    var classes = [
          PreferencesStore.getDensity(),
          PreferencesStore.getTheme()
        ].join(' '),
        $body = document.body;

    if ($body.className !== classes) {
      $body.className = classes;
    }
  }

}

module.exports = new WindowStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/window_store.js
 **/