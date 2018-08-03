/*global util*/
var notifier = require('helpers/notifier'),
    AppActions = require('actions/app_actions'),
    utils = require('helpers/utils'),
    appConfig = require('config/app_config'),
    AppDispatcher = require('dispatchers/app_dispatcher'),
    strings = require('strings/video_call_strings'),
    ApplicationStore = require('stores/application_store'),
    spi = require('spi');

class VideoChat {

  constructor(store) {
    this.events = $(document);
    this.attachBridgeComponents(store);
    this.subscribeToExternalWindowEvents(this.events);
  }

  attachBridgeComponents(store) {
    window.chat = {
      events: this.events,
      current_message_id: 0,
      delete_video_session: _.bind(store.deleteVideoSession, store),
      cancel_delete_video_session: function (jid) {
        var session = this.get_video_session(jid);
        if (session && session.timeout) {
          clearTimeout(session.timeout);
          delete session.timeout;
        }
      },
      get_video_session: function (jid) {
        return _.find(store.get('video_sessions'), {jid: jid});
      },
      set_video_session_type: function (jid, type) {
        var session = this.get_video_session(jid);
        if (session) {
          session.type = type;
        }
      },
      next_message_id: function () {
        return this.current_message_id++;
      }
    };

    window.app = {
      get_user_info: function (jid, return_placeholder) {
        var bare_jid = util.jid.bare_jid(jid),
            member = _.find(store.getRoster(), {jid: bare_jid});
        if (member) {
          return member;
        }
        return return_placeholder ? { name: '' } : null;
      },
      current_user_jid: store.get('current_user').user_jid,
      send_video_message: function (jid, args) {
        store.sendVideoMessage(jid, args);
      },
      get_video_session: function (jid) {
        return _.find(store.get('video_sessions'), {jid: jid});
      },
      send_delayed_video_message: function (to_jid, args) {
        var jid = "" + to_jid;
        if (typeof args === 'string') {
          args = JSON.parse(args);
        }
        var message_id = 'msg-' + args.message_id;
        if (args.type === 'hangup' || args.type === 'decline') {
          notifier.stopSounds();
        }
        store.data.delayed_video_messages[message_id] = {
          cancel: function () {
            delete store.data.delayed_video_messages[message_id];
            clearTimeout(this.timeout);
          },
          timeout: setTimeout(() => {
            delete store.data.delayed_video_messages[message_id];
            store.sendVideoMessage(jid, {
              type: args.type
            });
          }, args.timeout || 5000, jid)
        };
        return message_id;
      },
      attributes: {},
      set_video_attribute: function (name, value) {
        this["" + name] = "" + value;
      },

      get_video_attribute: function (name) {
        return this[name];
      },

      remove_video_attribute: function (name) {
        delete this[name];
      },

      cancel_delayed_video_message: function (message_id) {
        var message = store.get('delayed_video_messages')[message_id];
        if (message) {
          message.cancel();
          return true;
        }
        return false;
      },
      request_addlive_credentials: function (jid, callback) {
        AppDispatcher.dispatch('request-addlive-credentials', {
          jid: jid
        }, callback);
      },

      get_profile: function (jid, callback) {
        var info = store.get('profiles')[jid];

        if (info) {
          callback(info);
        } else {
          AppDispatcher.dispatch('request-profile', jid, (response) => {
            if (!response || !response.query) {
              return;
            }
            var profile = response.query;
            var data = {
              'jid': jid,
              'name': profile.name,
              'title': profile.title,
              'timezone': profile.timezone || '',
              'timezone_utc_diff': profile.timezone ? parseFloat(profile.timezone['utc_offset']) : 0,
              'email': profile.email,
              'photo': profile.photo_large,
              'photo_small': profile.photo_small
            };
            callback(data);
          });
        }
      }
    };

    window.util = utils;

    window.hipchat = console || {log: _.noop}; // This is fucked up, but it's only used for logging
  }

  notifyForIncomingCall(caller, doNotify) {
    notifier.playSound('incoming_call', true);
    notifier.setTitleNotification({
      id: caller.jid,
      text: strings.incoming_call_notification(caller.name)
    });
    if (doNotify) {
      AppActions.showNotification({
        group_id: ApplicationStore.get('config').group_id,
        group_name: ApplicationStore.get('config').group_name,
        jid: caller.jid,
        title: caller.name,
        body: strings.incoming_call_notification(caller.name),
        icon: ApplicationStore.get('asset_base_uri') + appConfig.notification_icon,
        type: 'incoming_call'
      });
    }
  }

  notifyForOutgoingCall() {
    notifier.playSound('outgoing_call', true);
  }

  stopAllSounds() {
    notifier.stopSounds();
  }

  stopIncomingNotification(caller_jid) {
    notifier.unsetTitleNotification(caller_jid);
  }

  openVideoUI(url, jid) {
    var window_size = utils.video.size_window(appConfig.video_width, appConfig.video_height, 640, 360),
        width = window_size.width,
        height = window_size.height;

    var width_ratio = width / appConfig.video_width;
    var height_ratio = height / appConfig.video_height;

    if (width_ratio < 1 && height_ratio < 1) {
      if (width_ratio < height_ratio) {
        width = Math.floor(appConfig.video_width * height_ratio);
      } else {
        height = Math.floor(appConfig.video_height * width_ratio);
      }
    } else if (height_ratio < 1) {
      width = Math.floor(appConfig.video_width * height_ratio);
    } else if (width_ratio < 1) {
      height = Math.floor(appConfig.video_height * width_ratio);
    }

    var pos = utils.video.center_window(width, height),
        props = 'resizable=yes,width=' + width + ',height=' + height + ',top=' + pos.top + ',left=' + pos.left,
        video_window = spi.openInternalWindow(url, 'HipChat', props);

    if (video_window) {
      $(video_window).on('beforeunload', (e) => {
        AppDispatcher.dispatch('addlive.video-window-event', {
          type: 'video_session_ended',
          data: {
            jid: jid,
            reloading: e.currentTarget.reloading
          }
        });
      });
      video_window.focus();
      window.video_window = video_window;
    }
    return video_window;
  }

  subscribeToExternalWindowEvents(events) {
    /*
     * The following is necessary because of how the original web client video module was written
     */
    events.on('video_session_ended video_session_started video_declined video_joined video_hangup', (evt, data) => {
      AppDispatcher.dispatch('addlive.video-window-event', {
        type: evt.type,
        data: data
      });
    });
  }

  triggerVideoCall(user) {
    this.events.trigger('video_call', user);
  }

  triggerVideoAccept(user) {
    this.events.trigger('video_accept', user);
  }

  triggerVideoHangup(user) {
    this.events.trigger('video_hangup', user);
  }

  triggerVideoDeclined(user) {
    this.events.trigger('video_decline', user);
  }

  triggerVideoInterrupt(user) {
    this.events.trigger('video_interrupt', user);
  }

  triggerVideoUnsupported(data) {
    this.events.trigger('video_unsupported', data);
  }

}

module.exports = VideoChat;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/video_chat.js
 **/