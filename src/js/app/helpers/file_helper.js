import moment from 'moment';
import utils from './utils';
import ChatWindowActions from 'actions/chat_window_actions';
import PreferencesStore from '../stores/preferences_store';
import AppDispatcher from 'dispatchers/app_dispatcher';
import AppConfig from 'config/app_config';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import strings from 'strings/fileviewer_strings';

class FileHelper {
  constructor() {
    let timeout = AppConfig.fetch_thumbnails_timeout;
    let boundFunction = this.fetchSignedThumbnailCollection.bind(this);

    this.thumbnailMap = {};
    this._debouncedFetchSignedThumbnailCollection = _.debounce(boundFunction, timeout, {
      leading: false,
      trailing: true
    });
  }

  /**
   * Returns true if the click event was triggered by a left click
   * @param  {event} event
   * @return {bool}
   */
  shouldOpenFileViewer(event = {}) {
    return (event.button === 0);
  }

  /**
   * Returns the filename from a path.
   * @param {string} path
   * @returns {string} filename
   */
  basename(path = '') {
    return path.split('/').pop();
  }

  /**
   * Returns the suffix from a path.
   * @param {string} path
   * @returns {string} filename
   */
  filesuffix(path = '') {
    var basename = this.basename(path);
    var suffix = basename.split('.').pop();
    return basename !== suffix ? suffix : '';
  }

  /**
   * Check if FileViewer supports previewing the given file.
   * @param {object} file
   * @returns {boolean} is file supported
   */
  fileViewerSupports(file = {}) {
    var normalized = this._normalizeFile(file);
    return this._guessMimeType(normalized) !== 'unknown';
  }

  /**
   * Transform a file to the format used by fileviewer.
   * @param {object} file
   * @returns {boolean} FileViewer file
   */
  transformForFileViewer(file = {}) {
    var normalized = this._normalizeFile(file);
    var item = {
      is_authenticated: normalized.is_authenticated,
      src: normalized.signed_url || normalized.url,
      srcDownload: normalized.url,
      title: normalized.name,

      // if we return 'not/supported' as the mime type for signed files, the file viewer will resolve the signed url before previewing the file
      type: normalized.is_authenticated ? 'not/supported' : this._guessMimeType(normalized),

      downloadable: this._isDownloadable(normalized),
      date: normalized.date,
      meta: normalized.meta
    };

    if (item.type === 'video/youtube') {
      item.title = file.title || 'Youtube Video';
    }

    return item;
  }

  _formatDateTime(time, format) {
    if (/^-?\d*\.?\d*$/.test(time)) {
      time = moment.unix(time);
    } else {
      time = moment(time);
    }

    return time.format(format);
  }

  /**
   * A file can either be an uploaded file or a link to a file.
   * @param {object} file
   * @returns {object} normalized file
   */
  _normalizeFile(file) {
    var dateFormatString = 'MMM D YYYY';
    var timeFormatString = PreferencesStore.shouldUse24HrTime() ? 'HH:mm' : 'h:mm A';

    return {
      url: file.image || file.file_url || file.url,
      name: this.basename(file.name || file.title || file.url),
      date: file.date || '',
      is_authenticated: !!file.is_authenticated,
      meta: {
        avatarSrc: file.sender_avatar,
        author: file.user_name || file.sender,
        authorPrefix: strings.default_metabar_author_prefix,
        date: this._formatDateTime(file.date, dateFormatString),
        time: this._formatDateTime(file.date, timeFormatString),
        fileSize: utils.file.get_size_string(file.size),
        fileType: this.filesuffix(file.image || file.file_url || file.name || file.url)
      }
    };
  }

  /**
   * Guesses the mimetype for a given file based on the path.
   * @param {object} normalized file
   * @returns {string} mimetype
   */
  _guessMimeType(file) {
    var name = (file.url || '').split('?')[0].toLowerCase() || (file.name || '').toLowerCase();
    var fileType = file.meta && file.meta.fileType ? file.meta.fileType : '';

    var isImage = name.match(/\.(png|jpg|jpeg|gif|svg)$/i) || fileType.match(/(png|jpg|jpeg|gif|svg)$/i);
    var isDoc = name.match(/\.pdf$/i) || fileType.match(/pdf$/i);
    var isAudio = name.match(/\.mp3$/i) || fileType.match(/mp3$/i);
    var isVideo = name.match(/\.mp4$/i) || fileType.match(/mp4$/i);
    var isYoutube = name.match(/(youtu(?:be\.com|\.be))/i);

    if (isImage) {
      return 'image/' + isImage[1].replace('jpg', 'jpeg').replace('svg', 'svg+xml');
    }
    if (isDoc) {
      return 'application/pdf';
    }
    if (isYoutube) {
      return 'video/youtube';
    }
    if (isVideo) {
      return 'video/mp4';
    }
    if (isAudio) {
      return 'audio/mp3';
    }

    return 'unknown';
  }

  /**
   * Check if a file is downloadable.
   * @param {object} file
   * @returns {boolean} is downloadable
   */
  _isDownloadable(file) {
    return this._guessMimeType(file) !== 'video/youtube';
  }

  /**
   * Download a file at a URL directly
   * @param {string} url of the file
   * @returns {boolean}
   */
  downloadFileAtUrl(url) {
    /*
     This is the only method available that works cross-browser,
     regardless of popup/privacy settings.
     */
    AnalyticsDispatcher.dispatch('analytics-secure-file-download');
    let frame = document.createElement('iframe'),
      remove = () => {
        frame.parentNode.removeChild(frame);
        AppDispatcher.dispatch('file-download-stop');
      };
    document.body.appendChild(frame);

    // this delay is necessary to initiate download
    _.delay(remove, AppConfig.file_download_timeout);
    frame.src = url;
  }

  /**
   * Fetches signed thumbnail collection from thumbnail map
   */
  fetchSignedThumbnailCollection() {
    ChatWindowActions.fetchSignedThumbnailCollection(this.thumbnailMap);
    this.thumbnailMap = {};
  }

  /**
   * Fetch signed thumbnail method
   * @param {File} file
   * @param {Function} cb
   * @param {Function} errCb
   */
  fetchSignedThumbnail({ id }, cb = _.noop, errCb = _.noop) {
    let item = { cb, errCb };

    this.thumbnailMap[id] = item;
    this._debouncedFetchSignedThumbnailCollection();
  }
}

module.exports = new FileHelper();


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/file_helper.js
 **/