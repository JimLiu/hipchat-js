/**
 * FileViewerActions
 */

import AppDispatcher from 'dispatchers/app_dispatcher';

export default {

  openInFileViewer(data) {
    AppDispatcher.dispatch('open-in-file-viewer', data);
  },

  openExternalFileInFileViewer(data) {
    AppDispatcher.dispatch('open-external-file-in-file-viewer', data);
  },

  fileViewerClosed(){
    AppDispatcher.dispatch('file-viewer-closed');
  },

  fetchSignedFile(data, successCb, rejectCb) {
    AppDispatcher.dispatch('API:fetch-signed-file', data, successCb, rejectCb);
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/file_viewer_actions.js
 **/