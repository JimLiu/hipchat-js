var AppDispatcher = require('dispatchers/app_dispatcher');
var AppActions = require('actions/app_actions');
var Store = require("lib/core/store");
var utils = require('helpers/utils');
var AppConfig = require('config/app_config');

class SearchStore extends Store {

  getDefaults() {
    return {
      jid: "",
      text: "",
      web_server: AppConfig.default_web_server,
      url: "",
      active_chat: ""
    };
  }

  registerListeners() {
    AppDispatcher.register({
      'search-history': (search) => {
        this.handleSearch(search);
      },
      'search-history-externally': (search) => {
        this.handleSearchExternally(search);
      },
      'updated:web_server': (web_server) => {
        this.set("web_server", web_server);
      },
      'updated:active_chat': (active_chat) => {
        this.set("active_chat", active_chat);
      }
    });
  }

  handleSearch(search) {
    this.set({
      'jid': search.jid,
      'text': search.text
    });
  }

  handleSearchExternally(search) {
    var jid = search.jid,
      url = `https://${this.data.web_server}/search?q=${search.text}`;

    if (jid && utils.jid.is_chat(jid) && utils.jid.is_private_chat(jid)) {
      url += '&t=uid-' + utils.jid.user_id(jid);
    } else if (jid && utils.jid.is_chat(jid) && utils.jid.is_room(jid)) {
      url += '&r=' + utils.jid.room_name(jid);
    }
    url = encodeURI(url);
    AppActions.openExternalWindow(url, '_blank');
    this.set({
      'url': url,
      'jid': search.jid,
      'text': search.text
    });
  }

}

module.exports = new SearchStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/search_store.js
 **/