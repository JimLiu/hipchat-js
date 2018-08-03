/*global FileViewer, videojs*/
import AppDispatcher from 'dispatchers/app_dispatcher';
import FileViewerActions from 'actions/file_viewer_actions';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import fileHelper from 'helpers/file_helper';
import logger from 'helpers/logger';
import utils from 'helpers/utils';
import RosterStore from 'stores/roster_store';
import AppStore from 'stores/application_store';
import spi from 'spi';

var normalize = fileHelper.transformForFileViewer.bind(fileHelper);
var isSupported = fileHelper.fileViewerSupports.bind(fileHelper);
var guessMimeType = fileHelper._guessMimeType.bind(fileHelper);

/**
 * Creates files loader function for FileViewer
 *
 * @returns {Function}
 */
function getModuleLoader () {

  let getAssetBaseUri = function () {
    var isMacNative = utils.clientSubType.isMac(AppStore.get('client_subtype')),
        assetBasePath = AppStore.get('asset_base_uri');

    if (isMacNative) {
      assetBasePath = '/wc/';
    }
    return assetBasePath;
  };

  let toInternal = function (name) {
    return {
      'pdf-viewer': 'pdf-view'
    }[name];
  };

  let modules = {
    'pdf-config': {
      workerSrc: getAssetBaseUri() + 'vendor/pdfjs/pdf.worker.min.js',
      viewer: getAssetBaseUri() + 'vendor/pdfjs/'
    },
    'pdf-viewer': null
  };

  return function (moduleName) {
    if (!modules[moduleName]) {
      let dfd = new $.Deferred();
      let assetBaseUri = getAssetBaseUri();

      if (moduleName === 'pdf-viewer') {
        spi.fetchPdfViewerResources(moduleName, assetBaseUri)
          .then((data) => {
            dfd.resolve(FileViewer.require(toInternal(moduleName)));
          })
          .catch((err) => {
            dfd.reject(err);
          });

      } else if (moduleName === 'pdf-config') {
        dfd.resolve(modules[moduleName]);

      } else {
        dfd.reject(`Module ${moduleName} is undefined.`);
      }

      modules[moduleName] = dfd.promise();
    }

    return modules[moduleName];
  };
}

module.exports = React.createClass({

  displayName: 'FileViewer',

  componentWillMount: function(){
    AppDispatcher.register({
      'open-in-file-viewer': this._open,
      'open-external-file-in-file-viewer': this._openExternalFile,
      'file-download-stop': this._stopDownloadIndicator,
      'close-file-viewer': this._closeFileViewer
    });
  },

  componentWillUnmount: function () {
    AppDispatcher.unregister({
      'open-in-file-viewer': this._open,
      'open-external-file-in-file-viewer': this._openExternalFile,
      'file-download-stop': this._stopDownloadIndicator,
      'close-file-viewer': this._closeFileViewer,

      // the following two events may or may not have been registered
      'files-fetched': this._updateCollection,
      'links-fetched': this._updateCollection
    });

    if (this._viewer) {

      if (this._viewer.isOpen()) {
        this._viewer.close();
      }

      this._viewer.off();
      this._viewer = null;
    }
  },

  render: function () {
    var styles = {
      display: 'none'
    };
    return (
      <div style={styles}></div>
    );
  },

  _viewer: null,

  _closeFileViewer: function() {
    if (this._viewer !== null && this._viewer.isOpen()) {
      this._viewer.close();
    }
  },

  _onViewerClose: function() {
    let event = document.createEvent('CustomEvent');
    event.initCustomEvent('click', false, false, null);

    document.dispatchEvent(event);

    FileViewerActions.fileViewerClosed();
  },

  _open: function (item) {
    var currentFile = normalize(item);

    if (typeof FileViewer === "undefined") {
      return false;
    }
    if (!this._viewer) {
      this._setupViewer();
    }

    var filesList = this._combineFilesAndLinks();

    if (!this._filesHaveBeenFetched()) {
      this._fetchFiles();
    }
    if (!this._linksHaveBeenFetched()) {
      this._fetchLinks();
    }

    var filesToShow = this._findFilesToShow(currentFile, filesList);

    this._viewer.setFiles(filesToShow);
    this._viewer.open({ srcDownload: currentFile.srcDownload }, 'main');
  },

  _openExternalFile: function (data) {
    var item = data.file;
    var currentFile = normalize(item);

    if (typeof FileViewer === 'undefined') { return; }
    if (!this._viewer) { this._setupViewer(); }

    var filesList = data.filesList || [currentFile];

    for (var i = filesList.length - 1; i >= 0; i--) {
      var tmpfile = filesList[i];
      if (tmpfile.url === currentFile.url) {
        tmpfile.src = currentFile.src;
      }
      filesList[i] = normalize(tmpfile);
    }

    var filesToShow = this._findFilesToShow(currentFile, filesList);

    this._viewer.setFiles(filesToShow);
    this._viewer.open({ srcDownload: currentFile.srcDownload }, 'main');
  },

  _setupViewer: function () {
    this._viewer = new FileViewer({
      metaBar: {
        defaultAvatar: ''
      },
      moduleBackend: getModuleLoader(),
      analyticsBackend: this._sendAnalytics,
      isPreviewGenerated: this._isPreviewGenerated,
      generatePreview: this._fetchSignedURL
    });

    this.debouncedInitiateDownload = _.debounce(this._initiateDownload, 2000, {leading: true, trailing: false});

    AJS.I18n.keys['cp.error.default.header'] = "We couldn't authenticate your account.";

    this._viewer.on('fv.close', this._onViewerClose);
    this._viewer.on('fv.download', this._onFileDownload);

    videojs.options.techOrder = ['html5', 'youtube'];

    AppDispatcher.register({
      'files-fetched': this._updateCollection,
      'links-fetched': this._updateCollection
    });
  },

  _onFileDownload(e) {
    let file = this._viewer.getCurrent();
    if (file.is_authenticated) {
      e.preventDefault();
      e.stopPropagation();
      this.debouncedInitiateDownload(file);
    }
  },

  _initiateDownload(file) {
    // this._startDownloadIndicator();
    this._fetchSignedURL(file, true).then((data) => {
      spi.downloadFile(data);
    }).fail(error => {
      logger.warn(error);
    });
  },

  _startDownloadIndicator() {
    _.attempt(() => {
      this._viewer._view.fileContentView.getLayerForName('content').$el.hide();
      this._viewer._view.fileContentView.getLayerForName('spinner').startSpin();
    });
  },

  _stopDownloadIndicator() {
    _.attempt(() => {
      this._viewer._view.fileContentView.getLayerForName('spinner').stopSpin();
      this._viewer._view.fileContentView.getLayerForName('content').$el.show();
    });
  },

  _filesHaveBeenFetched: function () {
    // We can't check if the files have already been fetched. Therefore, we simply assume they haven't been fetched
    // if there are not files in the room.
    return RosterStore.get('files').length;
  },

  _linksHaveBeenFetched: function () {
    // We can't check if the links have already been fetched. Therefore, we simply assume they haven't been fetched
    // if there are not links in the room.
    return RosterStore.get('links').length;
  },

  _fetchFiles: function () {
    AppDispatcher.dispatch('fetch-files', { room: RosterStore.data.active_chat });
  },

  _fetchLinks: function () {
    AppDispatcher.dispatch('fetch-links', { room: RosterStore.data.active_chat });
  },

  _fetchSignedURL(file, download = false) {
    let deferred = new $.Deferred();

    let resolveCb = data => {
      deferred.resolve(download ? data.temp_download_url : data.temp_url, guessMimeType(data));
    };

    let rejectCb = err => {
      deferred.reject(err);
    };

    FileViewerActions.fetchSignedFile({url: file.srcDownload || file.attributes.src}, resolveCb, rejectCb);
    return deferred.promise();
  },

  _isPreviewGenerated(file) {
    let deferred = new $.Deferred();
      if (file.attributes.is_authenticated) {
        deferred.resolve(false);
      } else {
        deferred.resolve(true, file.attributes.url, file.attributes.type);
      }
    return deferred;
  },

  // combines links and files, normalizes and then sorts them by date
  _combineFilesAndLinks: function () {
    var files = RosterStore.get('files');
    var links = RosterStore.get('links').filter(isSupported);
    return _.sortBy(files.concat(links), 'date').map(normalize);
  },

  _updateCollection: function () {
    if (!this._viewer.isOpen()) { return; }

    var filesList = this._combineFilesAndLinks();
    var currentFile = this._viewer.getCurrent();
    var currentSrc = currentFile && currentFile.srcDownload;

    var filesToShow = this._findFilesToShow(currentFile, filesList);
    this._viewer.setFiles(filesToShow, { srcDownload: currentSrc });
  },

  // In certain cases, the file to be shown show is not part of the files list:
  //  - The list of files / links has not been fetched yet
  //  - The file and link lists only include the latest items. However, a user
  //    can open older files / links via the chat panel
  //  - Links posted by a bot are not included in the link list.
  // In those cases, we will only show the selected file and ignore the file/link list.
  _findFilesToShow: function (currentFile, filesList) {
    var val;
    if (this._fileIsInList(currentFile, filesList)) {
      val = filesList;
    } else {
      val = [currentFile];
    }
    return val;
  },

  _fileIsInList: function (file, list) {
    var match = _.find(list, (x) => {
          return x.srcDownload === file.srcDownload;
        });

    return !!match;
  },

  _sendAnalytics: function (key, data) {
    AnalyticsDispatcher.dispatch('analytics-event', {
      name: key,
      properties: data
    });
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/file_viewer/file_viewer.js
 **/