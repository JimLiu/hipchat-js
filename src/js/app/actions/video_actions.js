import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import VideoServiceKeys from 'keys/video_service_keys';
import jid_utils from 'helpers/jid_utils';

export default {

  startScreenShare: function (jid) {
    AppDispatcher.dispatch(`${VideoServiceKeys.ENSO}.start-screen-share`, {jid});
  },

  showInviteFlag(data) {
    AppDispatcher.dispatch('show-flag', {
      id: data.id,
      type: 'video',
      sender: data.sender,
      photo: data.photo_url,
      message: data.message,
      service: VideoServiceKeys.ENSO
    });
  },

  showPopupsDisabledFlag(data) {
    AppDispatcher.dispatch('show-flag', {
      id: data.flag_id,
      type: 'video_popup_blocked',
      body: data.message,
      promise: data.promise
    });
  },

  removeInviteFlag(data) {
    AppDispatcher.dispatch('remove-flag', data.index);
  },

  sendVideoInviteDeclineMessage(data) {
    AppDispatcher.dispatch('send-video-message', {
      jid: data.jid,
      type: 'decline',
      reason: data.reason,
      service: VideoServiceKeys.ENSO
    });
  },

  handleRemoteDeclinedMessage(data) {
    AppDispatcher.dispatch('call-declined', data.message);
  },

  sendVideoInviteAcceptMessage(data) {
    AppDispatcher.dispatch('send-video-message', {
      jid: data.jid,
      type: 'accept',
      service: VideoServiceKeys.ENSO
    });
  },

  sendVideoInviteMessage(data) {
    AppDispatcher.dispatch('send-video-message', {
      jid: data.jid,
      url: data.url,
      type: 'call',
      service: VideoServiceKeys.ENSO,
      callback: data.callback
    });
  },

  sendHangupMessage(data) {
    let type = jid_utils.is_room(data.jid) ? 'room' : 'oto';
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: `hipchat.client.user.${type}.video.hangup`,
      properties: {
        room: data.room_id,
        service: VideoServiceKeys.ENSO
      }
    });
    AppDispatcher.dispatch('send-video-message', {
      jid: data.jid,
      type: 'hangup',
      service: VideoServiceKeys.ENSO
    });
  },

  generateMissedCallMessage(data) {
    AppDispatcher.dispatch('missed-call', data.message);
  },

  videoConferenceJoined() {
    AppDispatcher.dispatch(`${VideoServiceKeys.ENSO}.video-conference-joined`);
  },

  videoConferenceLeft() {
    AppDispatcher.dispatch(`${VideoServiceKeys.ENSO}.video-conference-left`);
  },

  destroyVideoSession() {
    AppDispatcher.dispatch(`${VideoServiceKeys.ENSO}.video-session-destroyed`);
  },

  videoCallConnected({ jid, start = 0, done = 0}) {
    let type = jid_utils.is_room(jid) ? 'room' : 'oto';
    let time = done - start;

    if (time <= 0) {
      return;
    }

    AnalyticsDispatcher.dispatch("analytics-event", {
      name: `hipchat.client.user.${type}.video.connected`,
      properties: {
        time,
        service: VideoServiceKeys.ENSO
      }
    });
  },

  joinRoomVideoCall(data) {
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: `hipchat.client.user.room.video.join`,
      properties: {
        room: data.room_id,
        service: VideoServiceKeys.ENSO
      }
    });
    AppDispatcher.dispatch(`${VideoServiceKeys.ENSO}.join-room-video`, data);
  },

  joinAddLiveCall(data) {
    AppDispatcher.dispatch(`${VideoServiceKeys.ADDLIVE}.start-video-call`, {
      service: VideoServiceKeys.ADDLIVE,
      type: 'call',
      jid: data.jid,
      audio_only: data.audio_only
    });
  },

  leaveAddLiveCall(jid) {
    AppDispatcher.dispatch(`${VideoServiceKeys.ADDLIVE}.audio-video-call-hung-up`, {
      sender: {
        jid
      }
    });
  },

  endAddLiveVideoSession(jid) {
    AppDispatcher.dispatch(`${VideoServiceKeys.ADDLIVE}.video-window-event`, {
      type: 'video_session_ended',
      data: {
        jid: jid,
        reloading: false
      }
    });
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/video_actions.js
 **/