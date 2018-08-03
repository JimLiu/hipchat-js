import Store from 'lib/core/store';
import AppDispatcher from 'dispatchers/app_dispatcher';
import AppConfig from 'config/app_config';
import utils from 'helpers/utils';
import VideoChat from 'helpers/video_chat';
import strings from 'strings/video_call_strings';
import VideoServiceKeys from 'keys/video_service_keys';
import ConfigStore from 'stores/configuration_store';
import PreferencesStore from 'stores/preferences_store';
import AppStore from 'stores/application_store';
import spi from 'spi';
import CurrentUserActions from 'actions/current_user_actions';

class VideoChatStore extends Store {

  constructor() {
    super();
    this.local = {};
  }

  getDefaults() {
    return {
      video_sessions: [],
      video_enabled: ConfigStore.get('video_enabled'),
      delayed_video_messages: {},
      incoming_invites: [],
      active_chat: '',
      profiles: {},
      current_user: {},
      web_server: AppConfig.default_web_server,
      video_chat_uri: ConfigStore.get('video_chat_uri')
    };
  }

  registerListeners() {
    AppDispatcher.registerOnce({
      'app-state-ready': () => {
        this.videoChat = new VideoChat(this);
      }
    });
    AppDispatcher.register({
      'updated:config': (config) => {
        this.set('video_chat_uri', config.video_chat_uri);
      },
      'updated:current_user': (data) => {
        this.data.current_user = data;
      },
      'updated:web_server': (web_server) => {
        this.set("web_server", web_server);
      },
      'updated:active_chat': (jid) => {
        this.data.active_chat = jid;
      },
      'updated:profiles': (data) => {
        this.handleProfiles(data);
      },
      'addlive.video-window-event': (data) => {
        this.handleExternalWindowEvent(data);
      },
      'addlive.start-video-call': (data) => {
        this.initiateVideoCall(data);
      },
      'addlive.invite-to-audio-video-call': (data) => {
        if (data.sender.jid !== this.data.current_user.user_jid) {
          this.handleVideoCallInvite(data);
        }
      },
      'addlive.answer-audio-video-call': (data) => {
        this.answerIncomingVideoCall(data);
      },
      'addlive.audio-video-call-accepted': (data) => {
        this.videoCallAcceptedByRemoteUser(data);
      },
      'addlive.audio-video-call-declined': (data) => {
        this.handleDeclinedMessage(data);
      },
      'addlive.decline-audio-video-call': (data) => {
        this.declineIncomingVideoCall(data);
      },
      'addlive.audio-video-call-hung-up': (data) => {
        this.handleHangupMessage(data);
      },
      'addlive.focus-video-window': (data) => {
        var session = this.getVideoSession(data.jid);
        if (session && session.window) {
          session.window.focus();
        }
      }
    });
  }

  handleProfiles(data) {
    _.forOwn(data, (profile, jid) => {
      if (!this.data.profiles[jid]) {
        this.data.profiles[jid] = {
          jid: jid,
          name: profile.name,
          title: profile.title,
          timezone: profile.timezone || '',
          timezone_utc_diff: profile.timezone ? parseFloat(profile.timezone['utc_offset']) : 0,
          email: profile.email,
          photo: profile.photo_large,
          photo_small: profile.photo_small
        };
      }
    });
  }

  handleVideoCallInvite(data) {
    var user = this.getCaller(data.sender.jid),
        session = this.getCurrentSession(),
        doInterrupt;
    this.videoChat.triggerVideoCall(user);
    if (session) {
      if (session.jid !== data.message.from) {
        return undefined;
      }
      if (!session.window || !session.window.isConnected) {
        doInterrupt = true;
      } else {
        return true;
      }
    } else {
      AppDispatcher.dispatch('show-flag', {
        id: `video-flag-${utils.now()}`,
        type: 'video',
        sender: data.sender.name,
        photo: user.photo_url,
        message: data.message,
        service: VideoServiceKeys.ADDLIVE
      });
    }
    this.videoChat.notifyForIncomingCall(user, PreferencesStore.getShowToasters());
    var invite = {
      caller: user,
      missed_timer: setTimeout(() => {
        this.handleMissedCall(user);
      }, AppConfig.missed_video_call_timeout)
    };
    this.data.incoming_invites.push(invite);
    if (doInterrupt) {
      this.handleVideoInterruptMessage(data.message);
    }
  }

  removeInvite(jid) {
    var invite = _.find(this.data.incoming_invites, {caller: this.getCaller(jid)});
    if (invite) {
      clearTimeout(invite.missed_timer);
      this.videoChat.stopAllSounds();
      _.pull(this.data.incoming_invites, invite);
      AppDispatcher.dispatch("hide-modal-dialog");
    }
  }

  answerIncomingVideoCall(data) {
    this.videoChat.stopAllSounds();
    this.videoChat.stopIncomingNotification(data.from);
    this.removeInvite(data.from);
    var audio_only = !_.get(data, 'x.call', {}).hasOwnProperty('video'),
        url = _.get(data, 'x.url', '');
    AppDispatcher.dispatch('send-video-message', {
      jid: data.from,
      type: 'accept',
      service: VideoServiceKeys.ADDLIVE
    });
    this.initiateVideoCall({
      jid: data.from,
      type: 'accept',
      audio_only: audio_only,
      url: url,
      service: url ? VideoServiceKeys.ENSO : VideoServiceKeys.ADDLIVE
    });
    window.app.get_profile(data.from, (profile) => {
      spi.callAnswered(data.from, profile);
      window.app.request_addlive_credentials(data.from, function(d, creds){
        spi.addLiveCredentialsReceived(creds);
      });
    });
  }

  declineIncomingVideoCall(data) {
    this.videoChat.stopAllSounds();
    this.videoChat.stopIncomingNotification(data.from);
    this.removeInvite(data.from);
    AppDispatcher.dispatch('send-video-message', {
      jid: data.from,
      type: 'decline',
      service: VideoServiceKeys.ADDLIVE
    });
  }

  handleMissedCall(caller) {
    this.videoChat.stopAllSounds();
    this.videoChat.stopIncomingNotification(caller.jid);
    var msg = {
      body: strings.missed_call_message(caller.name),
      type: "missed-call",
      from: caller.jid,
      delay: false,
      sender: " "
    };
    AppDispatcher.dispatch(`${VideoServiceKeys.ADDLIVE}.missed-call`, msg);
    AppDispatcher.dispatch("hide-modal-dialog");
  }

  createCallSession({jid, type, uri}) {
    this.data.video_sessions.push({
      jid,
      type,
      window: this.videoChat.openVideoUI(uri, jid)
    });
    CurrentUserActions.onCall();
  }

  isNativeAddLiveWindow() {
    return !!ConfigStore.get('feature_flags').web_client_native_addlive_window;
  }

  initiateVideoCall(data) {
    var session = this.getCurrentSession();

    if (!session) {
      let native_video_uri = this.get('video_chat_uri');
      data.uri = (native_video_uri) ? `${native_video_uri}?user_id=` : `https://${this.get('web_server')}/chat/video/`;
      data.uri += `${encodeURIComponent(utils.jid.user_id(data.jid))}`;

      if (data.audio_only) {
        data.uri += (native_video_uri) ? '&' : '?';
        data.uri += 'voice';
      }

      if (!this.isNativeAddLiveWindow()) {
        this.createCallSession(data);
      }

      if (data.type === 'call') {
        window.app.get_profile(data.jid, (profile) => {
          spi.callPlaced(data.jid, profile);
          if (this.isNativeAddLiveWindow()) {
            AppDispatcher.dispatch('send-video-message', {
              jid: data.jid,
              type: 'call',
              audio_only: data.audio_only,
              service: VideoServiceKeys.ADDLIVE
            });
          }
          window.app.request_addlive_credentials(data.jid, function(d, creds) {
            spi.addLiveCredentialsReceived(creds);
          });
        });
      }

      return;
    }

    // focus call window if connecting or connected to the call
    if (data.jid === session.jid && session.window) {
      let isConnected = session.window.isConnected,
          isConnecting = _.isUndefined(session.window.isConnected); // if disconnected, it would be 'false'
      if (isConnected || isConnecting) {
        session.window.focus();
        return;
      }
    }

    // ask if client (currently disconnected) want to switch to other call session
    if (confirm(strings.confirm_leave) && session.window) {
      this.deleteVideoSession(session.jid);
      session.window.close();

      this.createCallSession(data);
    }
  }

  handleDeclinedMessage(data) {
    var session = this.getCurrentSession();
    if (session && session.jid !== data.message.from) {
      return;
    }

    this.videoChat.stopAllSounds();
    var jid = utils.jid.bare_jid(data.from),
        user = this.getCaller(jid);
    this.videoChat.triggerVideoDeclined(user);
    CurrentUserActions.leaveCall();
    window.app.get_profile(data.message.from, (profile) => {
      spi.callDeclined(data.message.from, profile);
    });
  }

  handleVideoInterruptMessage(data) {
    var user = this.getCaller(data.from);
    this.videoChat.triggerVideoInterrupt(user);
  }

  handleHangupMessage(data) {
    var session = this.getCurrentSession();
    if (session && session.jid !== data.sender.jid) {
      return;
    }

    var from = _.get(data, 'message.from') || _.get(data, 'sender.jid');
    this.videoChat.stopAllSounds();
    this.videoChat.triggerVideoHangup(data.sender);
    this.removeInvite(from);
    CurrentUserActions.leaveCall();
    window.app.get_profile(data.sender.jid, (profile) => {
      spi.callHungup(data.sender.jid, profile);
    });
  }

  videoCallAcceptedByRemoteUser(data) {
    this.videoChat.stopAllSounds();
    var jid = utils.jid.bare_jid(data.message.from),
        user = this.getCaller(jid);
    this.videoChat.triggerVideoAccept(user);
  }

  deleteVideoSession(jid, delay) {
    this.videoChat.stopAllSounds();
    var session = this.getVideoSession(jid);
    if (delay) {
      if (session) {
        session.timeout = setTimeout(function(store) {
          if (session === store.getCurrentSession()) {
            store.destroyVideoSession(jid);
          }
        }, AppConfig.missed_video_call_timeout, this);
      }
    }
  }

  sendVideoMessage(jid, args) {
    if (typeof args === 'string') {
      args = JSON.parse(args);
    }
    // ngvideo app use 'join' instead of accept, so fix it
    if (args.type === 'join') {
      args.type = 'accept';
    }
    var type = this.determineMessageType(jid, args);
    var audio_only = _.get(args, 'audio_only', false);
    switch (type) {
      case 'call':
        if (!args.url) {
          this.videoChat.notifyForOutgoingCall();
        }
        break;
      case 'hangup':
        this.videoChat.stopAllSounds();
        CurrentUserActions.leaveCall();
        break;
      case 'accept':
        this.videoChat.stopAllSounds();
        break;
    }
    AppDispatcher.dispatch('send-video-message', {
      jid: jid,
      type: type,
      audio_only: audio_only,
      url: args.url || '',
      service: VideoServiceKeys.ADDLIVE
    });
  }

  handleExternalWindowEvent(args) {
    switch (args.type) {
      case 'video_session_started':
        this.videoChat.stopAllSounds();
        break;
      case 'video_joined':
        this.removeInvite(args.data);
        CurrentUserActions.onCall();
        // ensure that this client marked as `remoteAccepted` in ngvideo app
        this.videoChat.triggerVideoAccept(this.getCaller(args.data));
        return;
      case 'video_hangup':
        if (args.data === this.data.current_user.user_jid) {
          this.sendVideoMessage(args.data, {
            type: 'hangup'
          });
          CurrentUserActions.leaveCall();
        }
        break;
      case 'video_declined':
        this.sendVideoMessage(args.data, {
          type: 'decline'
        });
        this.deleteVideoSession(args.data);
        break;
      case 'video_session_ended':
        if (!args.data.reloading) {
          AppDispatcher.dispatch('send-video-message', {
            jid: args.data.jid,
            type: 'hangup',
            service: VideoServiceKeys.ADDLIVE
          });
          this.videoChat.stopAllSounds();
          this.destroyVideoSession(args.data.jid);
          CurrentUserActions.leaveCall();
        }
        break;
    }
  }

  determineMessageType(jid, args) {
    var session = this.getVideoSession(jid);
    if (args.type === 'decline' || args.type === 'hangup'){
      return args.type;
    }
    return session.type === 'call' && args.type === 'accept' ? 'call' : 'accept';
  }

  destroyVideoSession(jid) {
    var session = this.getVideoSession(jid);
    if (session && session.window) {
      let window = session.window;
      session.window = null;
      window.close();
    }
    this.data.video_sessions = _.reject(this.data.video_sessions, {jid: jid});
  }

  getVideoSession(jid) {
    return _.find(this.data.video_sessions, {jid: jid});
  }

  getCurrentSession() {
    return _.find(this.data.video_sessions, (session) => {
      return session.window && !session.timeout;
    });
  }

  getCaller(jid) {
    var roster = this.getRoster();
    return _.find(roster, {jid: jid});
  }

  getRoster() {
    return _.values(AppStore.get("roster"));
  }

}

export default new VideoChatStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/video_chat_store.js
 **/