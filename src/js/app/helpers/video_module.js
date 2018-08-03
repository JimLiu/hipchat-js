import AppDispatcher from 'dispatchers/app_dispatcher';
import AppActions from 'actions/app_actions';
import VideoActions from 'actions/video_actions';
import FlagActions from 'actions/flag_actions';
import CurrentUserActions from 'actions/current_user_actions';
import DAL from 'core/dal';
import spi from 'spi';
import AppConfig from 'config/app_config';
import utils from 'helpers/utils';
import logger from 'helpers/logger';
import notifier from 'helpers/notifier';
import strings from 'strings/video_call_strings';
import VideoServiceKeys from 'keys/video_service_keys';
import PreferencesStore from 'stores/preferences_store';
import ConfigStore from 'stores/configuration_store';
import CurrentUserStore from 'stores/current_user_store';
import Presence from 'lib/enum/presence';

class VideoModule {

  /**
   * Create a VideoModule
   */
  constructor() {
    this.data = this.getDefaults();
    this.registerListeners();
  }

  /**
   *
   * @returns {{
   *            video_session: null,
   *            incoming_invites: Array,
   *            roster: {},
   *            video_chat_uri: null,
   *            asset_base_uri: null
   *          }}
   */
  getDefaults() {
    return {
      video_session: {},
      incoming_invites: [],
      roster: {},
      feature_flags: {},
      group_id: null,
      video_chat_uri: null,
      asset_base_uri: null,
      is_native: utils.clientSubType.isNative(ConfigStore.get('client_subtype'))
    };
  }

  /**
   * register callbacks on the AppDispatcher
   */
  registerListeners() {
    this.handlerMap = {
      'updated:config': this._handleConfig,
      'updated:roster': this._handleRoster,
      'enso.start-video-call': this.initiateVideoCall,
      'enso.start-screen-share': this.initiateVideoCall,
      'enso.start-room-video': this.initiateRoomVideoCall,
      'enso.join-room-video': this.joinRoomVideoCall,
      'enso.invite-to-audio-video-call': this.handleVideoCallInvite,
      'enso.answer-audio-video-call': this.answerIncomingVideoCall,
      'enso.audio-video-call-accepted': this.videoCallAcceptedByRemoteUser,
      'enso.audio-video-call-declined': this.handleDeclinedMessage,
      'enso.decline-audio-video-call': this.declineIncomingVideoCall,
      'enso.audio-video-call-hung-up': this.handleHangupMessage,
      'enso.focus-video-window': this._focusVideoWindow,
      'enso.video-conference-joined': this.handleVideoConferenceJoined,
      'enso.video-conference-left': this.handleVideoConferenceLeft,
      'enso.video-session-destroyed': this.handleVideoSessionDestroy
    };

    _.mapValues(this.handlerMap, (fn, evt, map) => {
      map[evt] = _.bind(fn, this);
    });

    AppDispatcher.register(this.handlerMap);
  }

  cleanupListeners() {
    AppDispatcher.unregister(this.handlerMap);
  }

  _handleConfig(config) {
    if (config.group_id) {
      this.data.group_id = config.group_id;
    }
    if (config.asset_base_uri) {
      this.data.asset_base_uri = config.asset_base_uri;
    }
    if (config.video_base_url) {
      this.data.video_base_url = config.video_base_url;
    }
    if (_.has(config, 'feature_flags') && _.isObject(config.feature_flags)) {
      this.data.feature_flags = _.assign({}, this.data.feature_flags, config.feature_flags);
    }
  }

  _handleRoster(roster) {
    this.data.roster = roster;
  }

  _focusVideoWindow() {
    return this.hasVideoSession().then(hasSession => {
      if (hasSession) {
        this.data.video_session.window.focus();
      }
    });
  }

  _generateConferenceId() {
    let group = this.data.group_id ? this.data.group_id.toString() : '';
    let hash = utils.alphaNumeric(14);
    return _.padStart(group, 6, '0') + hash;
  }

  _getConferenceIdFromURL(url) {
    let path = url.split('?')[0];
    return path.slice(path.lastIndexOf('/') + 1, path.length);
  }

  _addTokenToUrl(url, token) {
    if (!token) {
      return url;
    }
    return utils.appendQueryParameter(url, 'jwt', token);
  }

  _addRingToUrl(url) {
    // If we should play_ring_sound_in_client, than we should not ring in Video Window
    if (this.data.feature_flags.web_client_play_ring_sound_in_client) {
      url = utils.setHashFragment(url, {
        'interfaceConfig.DISABLE_RINGING': 'true'
      });
    }
    return url;
  }

  /**
   * Initiate a video call
   * @param data
   * @returns {boolean}
   * TODO: refactor this so it's easier to follow and test
   */
  initiateVideoCall(data) {
    let start = Date.now();

    // if there's no active video session
    return this.hasVideoSession().then(hasSession => {
      if (hasSession) {
        this.determineVideoWindowAction(data, this.initiateVideoCall);
      } else {
        // create a new video session
        let is_outgoing = data.type === 'call';
        let callee_id = is_outgoing ? utils.jid.user_id(data.jid) : null;
        let conference_id = is_outgoing ? this._generateConferenceId() : this._getConferenceIdFromURL(data.url);
        let optionallyPreparedWindow = this.prepareCallSession();

        this.showConnectingFlag();
        DAL.fetchVideoToken(callee_id, conference_id).then(response => {
          data.url = data.url || `${this.data.video_base_url}/${conference_id}?`;
          if (is_outgoing) {
            clearTimeout(this.data.connecting_timer);
            return this.sendInvitation(data)
              .then(() => {
                data.url = this._addRingToUrl(data.url);
                data.url = this._addTokenToUrl(data.url, response.token);
                return this.createCallSession(data, optionallyPreparedWindow).then(video_window => {
                  this.data.video_session.start_time = start;
                  if (video_window.window || this.data.is_native) {
                    this.notifyForOutgoingCall();
                  } else {
                    this.notifyForPopupBlocked(data);
                  }
                });
              })
              .catch((action, reason) => {
                logger.debug('[ENSO]', action, reason);
              });
          } else if (data.type === 'accept') {
            data.url = this._addTokenToUrl(data.url, response.token);
            return this.createCallSession(data, optionallyPreparedWindow).then(video_window => {
              this.data.video_session.start_time = start;
              if (!video_window.window && !this.data.is_native) {
                this.notifyForPopupBlocked(data);
              }
            });
          }
        }).catch(error => {
          logger.debug('[ENSO JWT]', error);
          //TODO: Display an error to the user somehow
        });
      }
    });
  }

  initiateRoomVideoCall(data) {
    let start = Date.now();
    let conference_id = this._generateConferenceId();

    data.url = `${this.data.video_base_url}/${conference_id}?`;

    return this.hasVideoSession().then(hasSession => {
      if (hasSession) {
        this.determineVideoWindowAction(data, this.initiateRoomVideoCall);
      } else {
        return this.sendRoomInvitation({
          jid: data.jid,
          url: data.url.replace('/join/', '/call/')
        }).then(() => {
          this._joinRoomVideoCall(data, start);
        });
      }
    });
  }

  joinRoomVideoCall(data = { url: '' }) {
    let start = Date.now();
    let protocol = this.data.video_base_url.split(':')[0] || 'https';

    data.url = data.url.replace(/^https?:\/\//, `${protocol}://`).replace('/call/', '/join/');

    return this.hasVideoSession().then(hasSession => {
      if (hasSession) {
        this.determineVideoWindowAction(data, this.joinRoomVideoCall);
      } else {
        this._joinRoomVideoCall(data, start);
      }
    });
  }

  _joinRoomVideoCall(data, start) {
    let conference_id = this._getConferenceIdFromURL(data.url);
    let optionallyPreparedWindow = this.prepareCallSession();

    this.showConnectingFlag();
    return DAL.fetchVideoToken(null, conference_id).then(response => {
      data.url = this._addTokenToUrl(data.url, response.token);

      this.createCallSession(data, optionallyPreparedWindow)
        .then(video_window => {
          this.data.video_session.start_time = start;
          if (!video_window.window && !this.data.is_native) {
            this.notifyForPopupBlocked(data);
          }
        })
        .catch((action, reason) => {
          logger.debug('[ENSO]', action, reason);
        });
    }).catch(error => {
      logger.debug('[ENSO JWT]', error);
      //TODO: Display an error to the user somehow
    });
  }

  determineVideoWindowAction(data, next = () => {}) {
    var session = this.data.video_session,
        startNewConference = () => {
          this.handleVideoSessionDestroy().then(() => {
            next.call(this, data);
          });
        };

    // if there is an active video session
    if (data.jid === session.jid) {
      // focus call window if connected or rejoin the conference if not
      if (session.connected || session.connecting) {
        session.window.focus();
      } else {
        startNewConference();
      }
    } else if (session.connected) {
      // ask the user to confirm before leaving the current active conference
      if (confirm(strings.confirm_leave)) {
        startNewConference();
      } else {
        // if they choose not to leave the active conference, do nothing
        return true;
      }
    } else {
      // if they have a video window open but it's not connected, start a new session
      startNewConference();
    }
  }

  showConnectingFlag() {
    if (this.data.feature_flags.web_client_video_connecting_flag && this.data.is_native) {
      FlagActions.showFlag({
        type: 'info',
        body: strings.connecting,
        close: 'auto',
        delay: 10000
      });
    }
  }

  sendInvitation(data) {
    return new Promise((resolve, reject) => {
      VideoActions.sendVideoInviteMessage({
        jid: data.jid,
        url: data.url,
        callback: _.bind(this.handleResponseToSentInvitation, this, resolve, reject)
      });
    });
  }

  sendRoomInvitation(data) {
    return new Promise((resolve, reject) => {
      VideoActions.sendVideoInviteMessage({
        jid: data.jid,
        url: data.url
      });
      resolve();
    });
  }

  handleResponseToSentInvitation(success, fail, message) {
    let messageInfo = _.get(message, 'x');
    let [action, reason] = _.transform(messageInfo, (arr, val, key) => {
        if (key !== 'xmlns') {
        arr.push(key, val.reason);
      }
      return arr;
    }, []);

    switch (action) {
      case 'decline':
      case 'hangup':
        fail(action, reason);
        break;
      case 'trying':
      case 'ringing':
        success();
        break;
      default:
        fail('Error handling message ', message);
    }
  }

  /**
   * handle an invitation to a video conference
   * @param {Object} data
   * @returns {boolean}
   * TODO: refactor this so it's easier to follow and test
   */
  handleVideoCallInvite(data) {
    let jid = utils.jid.bare_jid(data.sender.jid);

    if (jid !== CurrentUserStore.get('jid')) {
      let user = this.getCaller(jid),
          session = this.data.video_session,
          invite_flag_id;

      return this.hasVideoSession().then(hasSession => {
        if (hasSession) {
          if (session.jid !== jid && session.connected) {
            // the user is currently in an active video conference: decline the invite
            VideoActions.sendVideoInviteDeclineMessage({
              jid: jid,
              reason: 'on_a_call'
            });
            return true;
          } else if (session.jid !== jid && !session.connected) {
            // the user has the video window open but is disconnected from the conference: show the invite flag
            invite_flag_id = `video-flag-${utils.now()}`;
          } else if (session.jid === jid && session.connected) {
            // the invite message is coming from the current session: take no action
            return true;
          }
        } else {
          invite_flag_id = `video-flag-${utils.now()}`;
        }

        // there's no current session
        VideoActions.showInviteFlag({
          id: invite_flag_id,
          sender: data.sender.name,
          photo_url: user.photo_url,
          message: data.message
        });
        this.notifyForIncomingCall(user);
        var invite = {
          invite_flag_id: invite_flag_id,
          caller: user,
          missed_timer: setTimeout(() => {
            this.handleMissedCall(user);
          }, AppConfig.missed_video_call_timeout)
        };
        this.data.incoming_invites.push(invite);
        spi.handleVideoCallInvite(
          this.answerIncomingVideoCall.bind(this, data.message),
          this.declineIncomingVideoCall.bind(this, data.message),
          {
            id: invite_flag_id,
            name: data.sender.name,
            avatar: user.photo_url
          }
        );
      });
    }
  }

  /**
   * remove an invitation flag
   * @param {String} jid
   */
  removeInvite(jid) {
    let invite = _.find(this.data.incoming_invites, {
      caller: { jid }
    });

    if (invite) {
      clearTimeout(invite.missed_timer);
      this.stopAllSounds();
      _.pull(this.data.incoming_invites, invite);
      VideoActions.removeInviteFlag({
        index: invite.invite_flag_id
      });
      spi.dismissVideoCallInvite(invite.invite_flag_id);
    }
  }

  /**
   * answer an incoming invitation
   * @param {Object} data
   */
  answerIncomingVideoCall(data) {
    let url = _.get(data, 'x.call.url', ''),
      jid = utils.jid.bare_jid(data.from);

    this.stopAllSounds();
    this.stopIncomingNotification(jid);
    this.removeInvite(jid);
    VideoActions.sendVideoInviteAcceptMessage({
      jid: jid
    });
    this.initiateVideoCall({
      jid: jid,
      type: 'accept',
      url: url,
      service: VideoServiceKeys.ENSO
    });
  }

  /**
   * decline an incoming invitation
   * @param {Object} data
   */
  declineIncomingVideoCall(data) {
    let jid = utils.jid.bare_jid(data.from);
    this.stopAllSounds();
    this.stopIncomingNotification(jid);
    this.removeInvite(jid);
    VideoActions.sendVideoInviteDeclineMessage({
      jid: jid,
      reason: 'decline'
    });
  }

  /**
   * handle a missed call
   * @param {Object} caller
   */
  handleMissedCall(caller) {
    this.stopAllSounds();
    this.stopIncomingNotification(caller.jid);
    var msg = {
      body: strings.missed_call_message(caller.name),
      type: "missed-call",
      from: caller.jid,
      delay: false,
      sender: " "
    };
    VideoActions.generateMissedCallMessage({
      message: msg
    });
  }

  /**
   * handle a missed call
   * @param {Object} caller
   */
  handleDeclinedCall(actor, reason) {
    this.stopAllSounds();
    var msg = {
      body: strings.call_declined[reason](actor.name),
      type: "system",
      from: actor.jid,
      delay: false,
      sender: 'HipChat',
      sender_avatar: []
    };
    VideoActions.handleRemoteDeclinedMessage({
      message: msg
    });
  }

  /**
   * prepare a call session
   */
  prepareCallSession() {
    let props = utils.video.get_video_window_props();
    return spi.prepareVideoWindow('HipChatVideoConference', props);
  }

  /**
   * create a call session
   * @param {String} jid
   * @param {String} url
   */
  createCallSession({ jid, room_id, url }, optionallyPreparedWindow) {
    let props = utils.video.get_video_window_props();
    return spi.initializeVideoWindow(url, 'HipChatVideoConference', props, optionallyPreparedWindow).then((videoWindow) => {
      this.data.video_session = {
        jid,
        connecting: true,
        connected: false,
        window: videoWindow
      };
      return videoWindow;
    });
  }

  /**
   * handle the remote decline message
   * @param {Object} data
   */
  handleDeclinedMessage(data) {
    let jid = utils.jid.bare_jid(data.message.from),
        reason = _.get(data.message, 'x.decline.reason', '');

    this.stopAllSounds();
    clearTimeout(this.data.connecting_timer);
    this.data.video_session.connecting = false;
    if (jid !== CurrentUserStore.get('jid') && reason) {
      this.handleDeclinedCall(data.sender, reason);
      CurrentUserActions.leaveCall();
    }
    if (reason === 'on_a_call') {
      try {
        const videoWindow = _.get(this.data, 'video_session.window');
        videoWindow.close.call(videoWindow);
      } catch (err) {
        logger.debug('[ENSO]', 'handleDeclinedMessage() attempted to close a video window and failed');
      }
    }
  }

  /**
   * handle the remote hangup message
   * @param {Object} data
   */
  handleHangupMessage(data) {
    return this.hasVideoSession().then(hasSession => {
      if (hasSession && this.data.video_session.jid !== utils.jid.bare_jid(data.sender.jid)) {
        return;
      }
      this.stopAllSounds();
      this.removeInvite(utils.jid.bare_jid(data.message.from));
      CurrentUserActions.leaveCall();
    });
  }

  /**
   * handle the remote accept message
   */
  videoCallAcceptedByRemoteUser() {
    clearTimeout(this.data.connecting_timer);
    this.stopAllSounds();
  }

  /**
   * destroy the video conference session
   */
  destroyVideoSession() {
    _.attempt(() => this.data.video_session.window.close());
    this.data.video_session = {};
  }

  /**
   * handle video session destroyed
   */
  handleVideoSessionDestroy() {
    return this.handleVideoConferenceLeft().then(() => {
      this.destroyVideoSession();
    });
  }

  /**
   * get the roster item for a user's jid
   * @param {String} jid
   * @returns {Object} - roster item
   */
  getCaller(jid) {
    return _.find(this.data.roster, {jid: jid});
  }

  /**
   * notify the user of an incoming call invite
   * @param {Object} caller
   * @param {bool} doNotification
   * @param {bool} playSound
   */
  notifyForIncomingCall(caller) {
    notifier.setTitleNotification({
      id: caller.jid,
      text: strings.incoming_call_notification(caller.name)
    });

    const notifyWhenDND = PreferencesStore.getNotifyForVideoWhenDND() || PreferencesStore.getNotifyWhenDND();
    const isDND = CurrentUserStore.get('show') === Presence.DND;
    const shouldNotify = notifyWhenDND && isDND || !isDND;

    if (shouldNotify) {
      AppActions.showNotification({
        group_id: ConfigStore.get('group_id'),
        group_name: ConfigStore.get('group_name'),
        jid: caller.jid,
        title: caller.name,
        body: strings.incoming_call_notification(caller.name),
        icon: this.data.asset_base_uri + AppConfig.notification_icon,
        type: 'incoming_call'
      });
    }
    notifier.playSound('incoming_call', true);
  }

  /**
   * notify the user that they're calling another user
   */
  notifyForOutgoingCall() {
    if (this.data.feature_flags.web_client_play_ring_sound_in_client) {
      notifier.playSound('outgoing_call', true);
    }
    clearTimeout(this.data.connecting_timer);
    this.data.connecting_timer = setTimeout(() => {
      this.handleUnansweredCall();
    }, AppConfig.missed_video_call_timeout);
  }

  handleUnansweredCall() {
    this.stopAllSounds();
    this.data.video_session.connected = false;
    this.data.video_session.connecting = false;
  }

  /**
   * notify the user that the browser is preventing the video window from opening
   */
  notifyForPopupBlocked(data) {
    VideoActions.showPopupsDisabledFlag({
      flag_id: 'popups_disabled_flag',
      message: 'Please enable popups and try again',
      promise: _.bind(() => {
        return this.createCallSession(data);
      }, this)
    });
  }

  /**
   * check if there's a session
   * @returns {boolean}
   */
  hasVideoSession() {
    return spi.hasActiveVideoSession().then(active_session => {
      return active_session || !!this.data.video_session.jid;
    });
  }

  /**
   * stop all ringing sounds
   */
  stopAllSounds() {
    notifier.stopSounds();
  }

  /**
   * stop the incoming call notification
   * @param {String} caller_jid
   */
  stopIncomingNotification(caller_jid) {
    notifier.unsetTitleNotification(caller_jid);
  }

  /**
   * take action when the video conference is joined
   */
  handleVideoConferenceJoined() {
    let done = Date.now();
    return this.hasVideoSession().then(hasSession => {
      if (hasSession) {
        this.data.video_session.connected = true;
        this.data.video_session.connecting = false;
        VideoActions.videoCallConnected({
          jid: this.data.video_session.jid,
          start: this.data.video_session.start_time,
          done
        });
        CurrentUserActions.onCall();
      }
    });
  }

  /**
   * take action when the video conference is left
   */
  handleVideoConferenceLeft() {
    this.stopAllSounds();
    return this.hasVideoSession().then(hasSession => {
      let shouldHangup = this.data.video_session.connected || this.data.video_session.connecting;
      if (hasSession && shouldHangup) {
        this.data.video_session.connected = false;
        this.data.video_session.connecting = false;
        let jid = this.data.video_session.jid;
        let room_id = this.data.video_session.room_id;
        VideoActions.sendHangupMessage({ jid, room_id });
        CurrentUserActions.leaveCall();
      }
    });
  }

}

export default VideoModule;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/video_module.js
 **/