/**
 * ChatWindowActions
 */

import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';

export default {

  /**
   * Request ancient history for a chat
   * @param data
   * @param data.jid JID of the chat
   */
  requestAncientHistory: function(data) {
    AppDispatcher.dispatch('requesting-ancient-history', data);
  },

  setScrollValue: function(data) {
    AppDispatcher.dispatch('set-scroll-value', data);
  },

  preserveScrollValue: function(opts = {}) {
    AppDispatcher.dispatch('preserve-scroll-value', opts);
  },

  displayMessageAction: function(data) {
    AnalyticsDispatcher.dispatch('analytics-events', {
      name: 'hipchat.client.integrations.message.action.open'
    });

    AppDispatcher.dispatch('display-message-action', data);
  },

  hideMessageAction: function(data) {
    AnalyticsDispatcher.dispatch('analytics-events', {
      name: 'hipchat.client.integrations.message.action.close'
    });

    AppDispatcher.dispatch('hide-message-action', data);
  },

  chatStartedScroll: function(jid) {
    AppDispatcher.dispatch('chat-is-scrolling', {scrolling: true, jid: jid});
  },

  updateScrollPosition: function(data) {
    AppDispatcher.dispatch('update-scroll-position', data);
  },

  chatStoppedScroll: function(jid) {
    AppDispatcher.dispatch('chat-is-scrolling', {scrolling: false, jid: jid});
  },

  toggleImage: function (data) {
    AppDispatcher.dispatch('toggle-image', {
      jid: data.jid,
      mid: data.mid
    });
  },

  senderClick: function(data) {
    AppDispatcher.dispatch('sender-clicked', data);
  },

  chatPanelMounted: function(data) {
    AnalyticsDispatcher.dispatch('analytics-chat-mount', data);
  },

  onFailedCancel: function(msg) {
    AppDispatcher.dispatch('cancel-failed-message', msg);
  },

  onFailedRetry: function(msg) {
    AppDispatcher.dispatch('retry-failed-message', msg);
  },

  /**
   * Opens a 1-1 chat by mention name
   * @param {string} mention name
   */
  openChatByMentionName: function(data){
    AppDispatcher.dispatch('open-chat-by-mention-name', data.mentionName);
  },

  dismissActionsDropDown: function() {
    AppDispatcher.dispatch('dismiss-active-actions-dropdown');
  },

  messageMediaLoaded(data){
    AppDispatcher.dispatch('message-media-loaded', data);
  },

  messageMediaSizeFound(data){
    AppDispatcher.dispatch('message-media-size-found', data);
  },

  toggleAttachedCards: function (mid) {
    AppDispatcher.dispatch('toggle-attached-cards', mid);
  },

  fetchSignedThumbnail(data, cb, errCb) {
    AppDispatcher.dispatch('API:fetch-signed-thumbnail', data, cb, errCb);
  },

  fetchSignedThumbnailCollection(fileObj) {
    AppDispatcher.dispatch('API:fetch-signed-thumbnail-collection', fileObj);
  },

  thumbnailIsLoading(instance) {
    AppDispatcher.dispatch('thumbnail-is-loading', instance);
  },

  thumbnailLoadedSuccess(instance) {
    AppDispatcher.dispatch('thumbnail-loaded-success', instance);
  },

  thumbnailLoadedError(data) {
    AppDispatcher.dispatch('thumbnail-loaded-error', data);
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/chat_window_actions.js
 **/