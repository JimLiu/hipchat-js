import FileViewerActions from 'actions/file_viewer_actions';

export function openInFileViewer(file, filesList) {
  let data = {
    file: file,
    filesList: filesList || []
  };

  FileViewerActions.openExternalFileInFileViewer(data);
}



/** WEBPACK FOOTER **
 ** ./src/js/app/api/modules/file_module.js
 **/