import Store from "lib/core/store";
import AppDispatcher from "dispatchers/app_dispatcher";
import AppConfig from "config/app_config";

class InlineDialogStore extends Store {

  getDefaults() {
    return {
      activeDialog: false,
      bannerShown: false,
      dialogData: false,
      web_server: AppConfig.default_web_server,
      current_user_id: ''
    };
  }

  registerListeners() {
    AppDispatcher.register({
      'show-inline-dialog': (data) => {
        this._showInlineDialog(data);
      },
      'hide-inline-dialog': () => {
        this._hideInlineDialog();
      },
      'toggle-inline-dialog': (data) => {
        this._toggleInlineDialog(data);
      },
      'updated:web_server': (web_server) => {
        this.set("web_server", web_server);
      },
      'notification-banner-status': (data) => {
        this.set('bannerShown', data.shown);
      },
      'updated:current_user': (data) => {
        this.set('current_user_id', data.user_id);
      }
    });
  }

  _toggleInlineDialog(data) {
    // Show a new dialog if it is different to the current one
    if (data.dialog_type !== this.getCurrentInlineDialog()) {
      this._showInlineDialog(data);
    } else { // Otherwise the new and current are the same so we hide it
      this._hideInlineDialog();
    }
  }

  _showInlineDialog(data) {
    this.set({
      activeDialog: data.dialog_type,
      dialogData: data.dialog_data
    });
  }

  _hideInlineDialog() {
    if (this.getCurrentInlineDialog() !== false) {
      this.set({
        activeDialog: false,
        dialogData: false
      });
    }
  }

  getCurrentInlineDialog() {
    return this.get("activeDialog");
  }
}

export default new InlineDialogStore();


/** WEBPACK FOOTER **
 ** ./src/js/app/stores/inline_dialog_store.js
 **/