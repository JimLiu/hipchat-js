import Store from "lib/core/store";
import AppDispatcher from "dispatchers/app_dispatcher";

class LayoutStore extends Store {

  getDefaults() {
    return {
      ready: false,
      active_chat: null,
      search_opened: false,
      rightSidebarVisibleWidthIsChanging: false
    };
  }

  registerListeners() {
    AppDispatcher.register({
      'app-state-ready': () => {
        this.set("ready", true);
      },
      'updated:active_chat': (data) => {
        this.set("active_chat", data);
      },
      'set-right-sidebar-visible-width-is-changing': (changing) => {
        this.set("rightSidebarVisibleWidthIsChanging", changing);
      },
      'search-history': () => {
        this.set('search_opened', true);
      },
      'remove-search-nav-item': () => {
        this.set('search_opened', false);
      }
    });
  }
}

module.exports = new LayoutStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/layout_store.js
 **/