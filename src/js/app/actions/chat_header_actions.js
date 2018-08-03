import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import VideoServiceKeys from 'keys/video_service_keys';

const DEBOUNCE_DELAY = 500;

const DEBOUNCE_OPTIONS = Object.freeze({
  leading: true,
  trailing: false
});

/**
 * Opens the video UI and calls a user
 * @param {object} data
 * @param {string} data.jid the jid of the user to call
 * @param {bool} data.audio_only whether or not this is an audio-only call
 */
export function startAddliveCall(data) {
  AnalyticsDispatcher.dispatch("analytics-event", {
    name: "hipchat.client.user.oto.video.call",
    properties: {
      service: VideoServiceKeys.ADDLIVE
    }
  });
  AppDispatcher.dispatch('addlive.start-video-call', {
    jid: data.jid,
    audio_only: data.audio_only,
    type: 'call',
    name: data.name || ''
  });
}

/**
 * Opens the video UI and calls a user
 * @param {object} data
 * @param {string} data.jid the jid of the user to call
 * @param {bool} data.audio_only whether or not this is an audio-only call
 */
export function startEnsoCall(data) {
  AnalyticsDispatcher.dispatch("analytics-event", {
    name: "hipchat.client.user.oto.video.call",
    properties: {
      service: VideoServiceKeys.ENSO
    }
  });
  AppDispatcher.dispatch('enso.start-video-call', {
    jid: data.jid,
    audio_only: data.audio_only,
    type: 'call',
    name: data.name || ''
  });
}

/**
 * Sends a notification to the room for users to join a room call
 * @param {object} data
 * @param {string} data.jid the jid of the room to call
 */
export function startEnsoRoomVideo(data) {
  AnalyticsDispatcher.dispatch("analytics-event", {
    name: "hipchat.client.user.room.video.call",
    properties: {
      room: data.room_id
    }
  });
  AppDispatcher.dispatch('enso.start-room-video', {
    jid: data.jid,
    room_id: data.room_id,
    audio_only: false,
    type: 'call',
    name: data.name || ''
  });
}


/**
 * Used to trigger actions on the chat header
 * @module actions/ChatHeaderActions
 */
export default {

  /**
   *
   * @param {object} data
   * @param {string} data.room JID of current chat
   * @param {string} data.type Panel type. Valid values: files, links, roster.
   */
  handlePanelSelect(data) {
    AppDispatcher.dispatch('select-panel', {
      activePanel: data.type
    });
  },

  /**
   * Initiates edit mode for the topic in the chat header
   */
  editTopicInChatHeader() {
    AppDispatcher.dispatch('edit-topic');
  },

  /**
   * Cancels the inline edit mode for the topic in the chat header
   */
  dismissTopicEdit() {
    AppDispatcher.dispatch('dismiss-topic-edit');
  },

  /**
   * Updates the topic value in the chat header
   * @param {string} newTopic New topic
   */
  changeTopic(newTopic) {
    AppDispatcher.dispatch('set-topic', newTopic);
  },

  startAddliveCall: _.debounce(startAddliveCall, DEBOUNCE_DELAY, DEBOUNCE_OPTIONS),
  startEnsoCall: _.debounce(startEnsoCall, DEBOUNCE_DELAY, DEBOUNCE_OPTIONS),
  startEnsoRoomVideo: _.debounce(startEnsoRoomVideo, DEBOUNCE_DELAY, DEBOUNCE_OPTIONS),

  startCall(data) {
    if (data.service === VideoServiceKeys.ENSO) {
      this.startEnsoCall(data);
    } else if (data.service === VideoServiceKeys.ADDLIVE) {
      this.startAddliveCall(data);
    }
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/chat_header_actions.js
 **/