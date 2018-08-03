import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import FormsStrings from 'strings/forms_strings';

/**
 * Used to trigger actions on the chat message input
 * @module actions/ChatInputActions
 */
export default {

  /**
   * Sends a message to the currently active chat
   * @param {object} data
   * @param {string} data.id Message ID
   * @param {string} data.jid JID of the currently active chat
   * @param {string} data.text Text of the message
   */
  sendMessage(data) {
    AppDispatcher.dispatch('send-message', data);
    AnalyticsDispatcher.dispatch('analytics-send-message', data);
  },

  clearChat(data) {
    AppDispatcher.dispatch('clear-messages', data);
  },

  closeChat(data) {
    AppDispatcher.dispatch('close-room', data);
  },

  /**
   * Join room
   * @param {object} data
   * @param {string} data.room Name of room or user mention
   */
  joinChat(data) {
    AppDispatcher.dispatch('join-room', data);
  },

  clearChatInput() {
    AppDispatcher.dispatch('clear-chat-input');
  },

  /**
   * Sets the chat input field's text value
   * @param {object} data
   * @param {string} data.text Text value of the message
   */
  setMsgValue(data) {
    AppDispatcher.dispatch('set-message-value', data.text);
  },

  appendMessage(data) {
    AppDispatcher.dispatch('append-message-value', data.text);
  },

  setCaretPosition(data) {
    AppDispatcher.dispatch('set-chat-caret-position', data);
  },

  resetNewForcedCaretPosition() {
    AppDispatcher.dispatch('reset-new-forced-caret-position');
  },

  expandAttachment(data) {
    AppDispatcher.dispatch('expand-attachment', data);
  },

  closeAttachment(data) {
    AppDispatcher.dispatch('close-attachment', data);
  },

  toggleTooltip(data) {
    AppDispatcher.dispatch('toggle-tooltip', data);
  },

  openTooltip(data) {
    AppDispatcher.dispatch('open-tooltip', data);
  },

  closeTooltip(data) {
    AppDispatcher.dispatch('close-tooltip', data);
  },

  showMessageLengthError() {
    AppDispatcher.dispatch('show-flag', {
      type: "error",
      body: FormsStrings.fail.message_too_long,
      close: "auto"
    });
  },

  showFileDescriptionLengthError() {
    AppDispatcher.dispatch('show-flag', {
      type: "error",
      body: FormsStrings.fail.file_description_too_long,
      close: "auto"
    });
  },

  setUserState(data) {
    AppDispatcher.dispatch('set-user-state', {
      jid: data.jid,
      type: data.type,
      state: data.state
    });
  },

  dismissActionsDropDown() {
    AppDispatcher.dispatch('dismiss-active-actions-dropdown');
  },

  getLastMessageSentByCurrentUser: function(jid, cb){
    AppDispatcher.dispatch('get-last-message-sent-by-current-user', {
        jid: jid,
        cb: cb
    });
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/chat_input_actions.js
 **/