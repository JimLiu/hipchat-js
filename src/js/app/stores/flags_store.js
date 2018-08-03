var Store = require("lib/core/store");
var dispatcher = require("dispatchers/app_dispatcher");

class FlagsStore extends Store {

  constructor() {

    super();

    this.data = {
      flags: []
    };

    this.flag_defaults = {
      type: 'info',
      close: 'manual',
      title: '',
      body: null,
      image_url: null,
      link_url: null,
      link_text: null,
      onClose: null
    };

    this.register_listeners();
  }

  register_listeners() {
    dispatcher.register({
      'show-flag': (flag_data) => {
        this.add_flag(flag_data);
      },
      'remove-flag': (flag_index) => {
        this.remove_flag(flag_index);
      }
    });
  }

  add_flag(flag_data) {
    this.data.flags.unshift(_.defaults(flag_data, this.flag_defaults));
    this.set('flags', this.data.flags);
  }

  remove_flag(flag_index) {
    let idx = _.findIndex(this.data.flags, {id: flag_index});
    if (idx) {
      flag_index = idx;
    }
    this.data.flags.splice(flag_index, 1);
    this.set('flags', this.data.flags);
  }

}

module.exports = new FlagsStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/flags_store.js
 **/