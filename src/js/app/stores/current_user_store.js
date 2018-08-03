import ModelStore from 'lib/core/model_store';
import CurrentUserModel from 'models/current_user_model';
import AppDispatcher from 'dispatchers/app_dispatcher';
import Presence from 'lib/enum/presence';
import AppConfig from 'config/app_config';
import VideoCallStrings from 'strings/video_call_strings';

const ON_CALL_PRESENCE = {
  show: Presence.DND,
  status: VideoCallStrings.call_status
};

class CurrentUserStore extends ModelStore {

  constructor() {
    super();

    this.local = {
      manual_presence: {
        show: Presence.AVAILABLE,
        status: ''
      }
    };
  }

  /**
   * @override
   */
  getModel() {
    return CurrentUserModel;
  }

  getDefaults() {
    return {
      email: '',
      guest_key: null,
      is_admin: false,
      is_guest: false,
      jid: '',
      mention: '',
      photo_large: '',
      photo_small: '',
      title: '',
      user_created_utc: null,
      id: null,
      user_name: '',
      show: Presence.AVAILABLE,
      status: '' // user set presence text
    };
  }

  registerListeners() {
    AppDispatcher.register({
      'updated:current_user': (user) => {
        this.setIfNotEqual(user);
      },
      'updated:roster': (roster) => {
        let user = roster[this.data.jid];
        if (user && user.presence) {
          this.setIfNotEqual({
            show: user.presence.show,
            status: user.presence.status
          });
        }
      },
      'set-current-user-status': (presence) => {
        this._saveManualPresence(presence);
        this._updatePresence(presence);
      },
      'set-current-user-idle': () => {
        if (!this._checkIfOnCall()) {
          this._setIdle();
        }
      },
      'set-current-user-active': () => {
        if (!this._checkIfOnCall()) {
          this._setActive();
        }
      },
      'user-on-call': () => {
        this._setOnCall();
      },
      'user-leave-call': () => {
        this._setLeaveCall();
      },
      'application-focused': () => {
        // Only restore the presence if the user is idle.
        if (this.data.show === Presence.IDLE) {
          this._setActive();
        }
      }
    });
  }

  _setIdle() {
    this._updatePresence({ show: Presence.IDLE });
  }

  _setActive() {
    this._updatePresence(this.local.manual_presence);
  }

  _checkIfOnCall() {
    return this.data.status === ON_CALL_PRESENCE.status && this.data.show === ON_CALL_PRESENCE.show;
  }

  _setOnCall() {
    this._updatePresence(ON_CALL_PRESENCE);
  }

  _setLeaveCall() {
    this._updatePresence(this.local.manual_presence);
  }

  _saveManualPresence(presence) {
    // Don't save the current presence if the user is idle.
    // This is a safeguard as you can't manually set yourself as idle.
    if (presence.show !== Presence.IDLE) {
      this.local.manual_presence = { ...presence };
    }
  }

  _resetManualPresence() {
    this.local.manual_presence = {
      show: Presence.AVAILABLE,
      status: ''
    };
  }

  _updatePresence({ show = this.data.show, status = this.data.status } = {}) {
    var presence = { show, status },
        current = { show: this.data.show, status: this.data.status };

    if (!_.isEqual(presence, current)) {
      presence.status = presence.status.trim();

      if (presence.status.length > AppConfig.max_presence_text_length) {
        presence.status = presence.status.substring(0, AppConfig.max_presence_text_length);
      }

      this.set(presence);
      AppDispatcher.dispatch('update-presence', presence);
    }
  }

  /**
   * @override
   */
  reset() {
    this._resetManualPresence();
    super.reset();
  }

}

export default new CurrentUserStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/current_user_store.js
 **/