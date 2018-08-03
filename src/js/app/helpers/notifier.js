import AppDispatcher from 'dispatchers/app_dispatcher';
import FaviconCounter from 'helpers/favicon_counter';
import TitleCounter from 'helpers/title_counter';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import PreferencesStore from 'stores/preferences_store';
import Presence from 'lib/enum/presence';
import AppConfig from 'config/app_config';
import utils from 'helpers/utils';
import logger from 'helpers/logger';
import strings from 'strings/chat_panel_strings';

class Notifier {

  constructor() {
    this.isSupported = typeof Notification !== 'undefined';
    this.totalUnreadCount = 0;
    this.totalUnreadHasMention = false;
    this.titleNotifications = [];
    this.audioDuration = {};
    this.canPlay = {};
    this.autoclose_timeout = AppConfig.notification_close_timeout;
    this.maxNotifications = AppConfig.notification_limit;
    this.notificationCount = 0;
    this.group_name = '';
    this.feature_flags = {};
    this.current_user_presence = Presence.AVAILABLE;

    this.titleCounter = new TitleCounter({
      group_name: this.group_name,
      feature_flags: this.feature_flags
    });

    try {
      this.favicon = new FaviconCounter({
        bgColor: AppConfig.favicon_bg_color,
        maxCount: AppConfig.max_unread_count
      });
    } catch (e) {
      logger.warn(e);
    }
  }

  initialize(asset_base_uri, sound_asset_overrides = {}) {
    function addSrc(audio, mediaType, path) {
      var src = document.createElement('source');
      src.type = mediaType;
      src.src = path;
      audio.appendChild(src);
    }

    if (typeof Audio !== "undefined") {
      let supportCanPlay = 'oncanplay' in Audio.prototype;

      this.audio = {
        notification: asset_base_uri + (sound_asset_overrides.notify_sound_asset || AppConfig.notify_sound_asset),
        incoming_call: asset_base_uri + (sound_asset_overrides.incoming_sound_asset || AppConfig.incoming_sound_asset),
        outgoing_call: asset_base_uri + (sound_asset_overrides.outgoing_sound_asset || AppConfig.outgoing_sound_asset)
      };
      _.forOwn(this.audio, (path, key) => {
        this.audio[key] = new Audio();
        this.audio[key].addEventListener("loadedmetadata", () => {
          this.audioDuration[key] = this.audio[key].duration;
        });

        let canPlayHandler = () => {
          this.canPlay[key] = true;
        };

        let checkIfCanPlay = this.checkIfCanPlay.bind(this, this.audio[key]);

        if(supportCanPlay) {
          this.audio[key].oncanplay = canPlayHandler;
        } else if(checkIfCanPlay('audio/ogg') || checkIfCanPlay('audio/mpeg')) {
          canPlayHandler();
        }

        addSrc(this.audio[key], 'audio/ogg', `${path}.ogg`);
        addSrc(this.audio[key], 'audio/mpeg', `${path}.mp3`);
      });
    }
  }

  checkIfCanPlay(element, type) {
    if (!element.canPlayType) {
      return false;
    }

    let result = element.canPlayType(type);

    if (result === 'probably' || result === 'maybe') {
      return true;
    }
    return false;
  }

  update(data) {
    this.group_name = data.group_name || this.group_name;
    this.feature_flags = data.feature_flags || this.feature_flags;
    this.current_user_presence = data.current_user_presence || this.current_user_presence;

    if (this.titleCounter) {
      this.titleCounter.update({
        group_name: this.group_name,
        feature_flags: this.feature_flags
      });
    }
  }

  notify(data) {
    this._increaseCount();

    if (this._shouldNotify(data.type)) {
      let title = data.title;
      if (_.get(this.feature_flags, "web_client_subdomain_scoped_session")) {
        title = this._formatNewMessageNotificationTitle(data);
      }
      let notification = new Notification(title, this._getOptions(data));
      this._bindNotification(notification, data.jid);
    }
  }

  _shouldNotify(type) {
    return this.isSupported
      && (this.current_user_presence !== Presence.DND
          || PreferencesStore.getNotifyWhenDND()
          || (PreferencesStore.getNotifyForVideoWhenDND() && type === 'incoming_call'));
  }

  _formatNewMessageNotificationTitle(data){
    let title = strings.notification_title_with_group(data.title, data.group_name);
    return utils.strings.ellipsis(title, AppConfig.notification_title_max_character_length);
  }

  _shouldPlaySound(type) {
    if (!PreferencesStore.getSoundsEnabled()) {
      return false;
    }

    let message_sounds = PreferencesStore.getMessageSounds(),
        video_sounds = PreferencesStore.getVideoSounds(),
        is_dnd = this.current_user_presence === Presence.DND,
        notify_when_dnd = PreferencesStore.getNotifyWhenDND(),
        notify_for_video_when_dnd = PreferencesStore.getNotifyForVideoWhenDND();

    if (type === 'outgoing_call' && video_sounds) {
      return true;

    } else if (type === 'notification' && message_sounds && (!is_dnd || notify_when_dnd)) {
      return true;

    } else if (type === 'incoming_call' && video_sounds && (!is_dnd || notify_when_dnd || notify_for_video_when_dnd)) {
      return true;
    }
    return false;
  }

  playSound(type, loop) {
    if (!this._shouldPlaySound(type)) {
      return;
    }

    if (this.audio[type] && this.canPlay[type]) {
      var audio = this.audio[type],
          duration = this.audioDuration[type],
          reset = function() {
            this.currentTime = 0;
            this.play();
          };
      if (duration && (audio.currentTime < duration)) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          logger.warn('HC-Client', e);
        }
      }
      if (loop) {
        audio.addEventListener('ended', reset);
      } else {
        audio.removeEventListener('ended', reset);
      }
      audio.play();
    }
  }

  stopSounds(type) {
    function stop(audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {
        logger.warn('HC-Client', e);
      }
    }
    if (type && this.audio[type] && this.canPlay[type]) {
      stop(this.audio[type]);
    } else {
      _.forEach(this.audio, (audio) => {
         stop(audio);
      });
    }
  }

  updateTotalUnreadCount(count, hasMention) {
    if (count !== this.totalUnreadCount || hasMention !== this.totalUnreadHasMention) {
      this._updateFavicon(count, hasMention);
      this._updateTitleBadge(count);
      this.totalUnreadCount = count;
      this.totalUnreadHasMention = hasMention;
    }
  }

  setTitleNotification(notification) {
    this.titleNotifications.push(notification);
    this._updateTitleNotification();
  }

  unsetTitleNotification(id) {
    _.remove(this.titleNotifications, { id: id });
    this._updateTitleNotification();
  }

  _getOptions(data) {
    var notificationData = {
      icon: data.icon,
      body: data.body
    };
    if (this.notificationCount >= this.maxNotifications) {
      notificationData.tag = true;
    }
    return notificationData;
  }

  _bindNotification(notification, jid) {
    notification.onclick = function () {
      window.focus();
      AppDispatcher.dispatch('set-route', {jid: jid});
      AppDispatcher.dispatch('focus-video-window', {jid: jid});
      AnalyticsDispatcher.dispatch('analytics-select-room', {jid: jid});
      this.close();
    };
    notification.onshow = () => {
      setTimeout(() => {
        notification.close();
      }, this.autoclose_timeout);
    };
    notification.onclose = () => {
      this._decreaseCount(notification);
    };
  }

  _increaseCount() {
    this.notificationCount++;
  }

  _decreaseCount(notification) {
    if (notification.tag) {
      this.notificationCount = 0;
    } else {
      this.notificationCount--;
    }
  }

  _updateFavicon(unreadTotal, hasMention) {
    if (this.favicon) {
      if (unreadTotal > 0) {
        var opts = {
          bgColor: AppConfig.favicon_bg_color,
          maxCount: AppConfig.max_unread_count
        };
        if (hasMention) {
          opts.bgColor = AppConfig.favicon_bg_color_with_mention;
        }
        this.favicon.badge(unreadTotal, opts);
      } else {
        this.favicon.reset();
      }
    }
  }

  _updateTitleBadge(unreadTotal) {
    if (!this._browserNeedsBadge()){
      return;
    }

    let unread_count = (unreadTotal > 0) ? unreadTotal : 0,
        notification = this._getCurrentTitleNotification();
    this.titleCounter.set(unread_count, notification);
  }

  _updateTitleNotification() {
    var notification = this._getCurrentTitleNotification(),
        unread_count = this._browserNeedsBadge() ? this.totalUnreadCount : 0;
    this.titleCounter.set(unread_count, notification);
  }

  _getCurrentTitleNotification() {
    var currentNotification = _.last(this.titleNotifications);
    return _.get(currentNotification, 'text', null);
  }

  _browserNeedsBadge() {
    return utils.browser.is.ie() || utils.browser.is.ie_edge() || utils.browser.is.safari();
  }

}

module.exports = new Notifier();



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/notifier.js
 **/