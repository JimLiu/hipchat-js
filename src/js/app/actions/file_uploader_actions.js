import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';

module.exports = {

  dispatchFileError: function(data) {
    AppDispatcher.dispatch('file-error', data);
  },

  clearFileErrors: function(data) {
    AppDispatcher.dispatch('clear-errors', data);
  },

  openFilePicker: function() {
    AnalyticsDispatcher.dispatch('analytics-input-actions-upload-invoke');
    AppDispatcher.dispatch('open-file-picker');
  },

  filePasted: function(e) {
    AppDispatcher.dispatch('file-pasted', e);
  },

  fileChosen: function(e, source) {
    AppDispatcher.dispatch('file-chosen', e, source);
  },

  changeFileName: function(data) {
    AppDispatcher.dispatch('change-filename', data);
  },

  /**
   * Upload's a file to the currently active chat
   * @param {object} data
   * @param {string} data.jid JID of the currently active chat
   * @param {string} data.fileName Name of the file
   */
  uploadFile: function(data) {
    AppDispatcher.dispatch('upload-file', data);
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/file_uploader_actions.js
 **/