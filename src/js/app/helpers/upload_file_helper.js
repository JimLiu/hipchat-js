import AppDispatcher from "dispatchers/app_dispatcher";
import utils from "helpers/utils";
import link_utils from "helpers/link_utils";
import FileUploaderActions from "actions/file_uploader_actions";
import ChatInputActions from "actions/chat_input_actions";
import AppConfig from "config/app_config";
import chatInputStrings from 'strings/chat_input_strings';
import spi from 'spi';
import logger from 'helpers/logger';
import URI from 'helpers/uri';
import api from 'api/api';
import regex_helpers from "helpers/regex_helpers";
import ConfigStore from 'stores/configuration_store';

class UploadFileHelper {

  constructor() {
    this._registerListeners();
    this._bindDOMEvents();
    this._uploading_state = {};
  }

  destroy() {
    this._unregisterListeners();
    this._unbindDOMEvents();
  }

  _registerListeners() {
    AppDispatcher.register({
      'upload-file': (data) => {
        this._uploading_state[data.jid] = true;
      },
      'upload-successful': (data) => {
        this._uploading_state[data.jid] = false;
      },
      'upload-failed': (data) => {
        this._handleUploadFailed(data);
        this._uploading_state[data.jid] = false;
      },
      'open-file-picker': () => {
        this._openFilePicker();
      },
      'file-pasted': (e) => {
        this._handleFilePasted(e);
      },
      'file-chosen': (e, source) => {
        this._onFileChosen(e, source);
      },
      'add-file-for-upload-with-url': (data) => {
        this._handleUploadViaUrl(data);
      },
      'add-file-for-upload-with-base64': (data) => {
        this._handleUploadViaBase64(data);
      },
      'updated:active_chat': (jid) => {
        this.active_chat = jid;
      },
    });
  }

  _unregisterListeners() {
    AppDispatcher.unregister({
      'upload-failed': () => {
        this._handleUploadFailed();
      },
      'open-file-picker': () => {
        this._openFilePicker();
      },
      'file-pasted': () => {
        this._handleFilePasted();
      },
      'file-chosen': () => {
        this._onFileChosen();
      },
      'add-file-for-upload': () => {
        this._handleFileForUploadWithUrl();
      },
      'add-file-for-upload-with-base64': () => {
        this._handleUploadViaBase64();
      }
    });
  }

  _bindDOMEvents() {
    document.addEventListener('dragenter', this._handleDragEnter.bind(this));
    document.addEventListener('dragover', this._handleDragEnter.bind(this));
    document.addEventListener('drop', this._handleDrop.bind(this));
  }

  _unbindDOMEvents() {
    document.removeEventListener('dragenter', this._handleDragEnter);
    document.removeEventListener('dragover', this._handleDragEnter);
    document.removeEventListener('drop', this._handleDrop);
  }

  _handleUploadViaUrl(data) {
    if (data && data.fileUrl) {
      this._handleFileForUploadWithUrl(data.fileUrl, data.source);
    }
  }

  _handleUploadViaBase64(data) {
    if (data && data.base64) {
      this._handleFileForUploadWithBase64(data.base64, data.fileName, data.source);
    }
  }

  _handleUploadFailed(data = {}) {
    if (data.error && data.error.code === 503){
      this._dispatchError('service_unavailable', data.jid);
    } else if (data.error && data.error.code === 400) {
      this._dispatchError('unable_to_upload_image', data.jid);
    } else {
      this._dispatchError('unable_to_upload', data.jid);
    }
  }

  _handleDragEnter(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  _handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    if (this._uploading_state[this.active_chat]) {
      return;
    }

    let url_regex = new RegExp(regex_helpers.url, "i");

    let html = e.dataTransfer.getData('text/html'),
        textOrUrl = e.dataTransfer.getData('text/plain'),
        text = null,
        url = null,
        file = !!e.dataTransfer.files.length;

    if (!file && textOrUrl !== '') {
      if (url_regex.test(textOrUrl)) {
        url = textOrUrl;
      } else {
        text = textOrUrl;
      }
    }

    if (url) {
      this._handleDropUrl(url);
    } else if (text) {
      this._handleDropText(text);
    } else if (html) {
      this._handleDropHtml(html);
    } else {
      this._handleDropFile(e);
    }
  }

  _handleDropHtml(html) {
    let url = '',
        img = $('<div/>').html(html).find('img')[0],
        a = $('<div/>').html(html).find('a')[0];

    if (img && $(img).hasClass('remoticon')) {
      this._handleDropText($(img).attr('alt'));
    } else if (img) {
      url = this._tryRemoveQuery($(img).attr('src'));
      this._handleUrl(url);
    } else if (a) {
      url = this._tryRemoveQuery($(a).attr('href'));
      this._handleUrl(url);
    }
  }

  _handleDropUrl(url) {
    this._handleUrl(url);
  }

  _handleDropText(text) {
    api.focusChatInput();
    ChatInputActions.appendMessage({text: text});
  }

  _handleDropFile(e) {
    spi.focusApp();
    this._onFileChosen(e, "dragndrop");
  }

  _tryRemoveQuery(urlForCheck) {
    let withoutQuery = link_utils.remove_query_string(urlForCheck);

    if (this._isAllowedUrlFileType(withoutQuery)){
      urlForCheck = withoutQuery;
    }
    return urlForCheck;
  }

  _handleUrl(url) {
    api.focusChatInput();
    if (this._isAllowedUrlFileType(url)) {
      this._handleFileForUploadWithUrl(url, "dragndrop");
    } else {
      this._tryUrlByLoadingImage(url);
    }
  }

  _isAllowedUrlFileType(url) {
    let isBase64 = this.isBase64Image(url);
    url = url.toLowerCase();
    return ( _.endsWith(url, '.jpg')
           || _.endsWith(url, '.jpeg')
           || _.endsWith(url, '.png')
           || this.isGIF(url)
           || isBase64);
  }

  isGIF(url){
    return _.endsWith(url.toLowerCase(), '.gif');
  }

  isBase64Image(src){
    return /^data:image\/[a-z+]{3,8};base64,(.|\n)+/.test(src);
  }

  _handleFilePasted(e) {
    if (e.clipboardData && e.clipboardData.items) {
      var dataTransferItem = e.clipboardData.items[0];
      if (dataTransferItem && dataTransferItem.kind === "file") {
        this._onFileChosen(e, "paste");
      }
    }
  }

  _handleFileForUploadWithBase64(base64, fileName, source) {
    var blob = utils.file.base64_to_blob(base64, fileName);
    if (blob) {
      this._handleBlobLoaded(blob, fileName, source);
    }
  }

  _handleFileForUploadWithUrl(fileUrl, source) {
    this._getBlobFromUrl(fileUrl, this._handleBlobLoaded.bind(this), source);
  }

  _getBlobFromUrl(file_url, cb, source, xhr = new XMLHttpRequest(), reader = new FileReader()) {

    if (!_.isFunction(cb)){
      logger.type('upload-file-helper').warn('Callback for _getBlobFromUrl function is not defined.');
      return;
    }

    if (!file_url || !this._validateFileUrl(file_url)){
      logger.type('upload-file-helper').warn('File url is not valid: ', file_url);
      return;
    }

    let file_name = (this.isBase64Image(file_url)) ? false : utils.file.get_file_name(file_url);

    if (URI.getProtocol(file_url).length >= location.protocol.length - 1){

      this._getDataWithXHRRequest(xhr, reader, cb, source, file_name, file_url);

    } else {

      if (this.isBase64Image(file_url)) {

        let blob = utils.file.base64_to_blob(file_url);

        cb(blob, file_name, source);
        logger.type('upload-file-helper').info('Blob from base64 image received.');

      } else if (this.isGIF(file_url)) {

        logger.type('upload-file-helper').info('GIF loading via canvas is skipped.');
        ChatInputActions.appendMessage({text: ` ${file_url}`});

      } else {

        this._getDataByLoadingImage(cb, source, file_name, file_url);
      }
    }
  }

  _getDataWithXHRRequest(xhr, reader, cb, source, file_name, file_url){

    xhr.open("GET", file_url);
    xhr.responseType = "blob";
    xhr.onerror = () => {
      ChatInputActions.appendMessage({text: ` ${file_url}`});
      logger.type('upload-file-helper').warn('Image failed to load via xhr: ', file_url);
    };
    xhr.onload = function() {
      let response = xhr.response;
      reader.readAsArrayBuffer(response);
      reader.onerror = () => {
        this._dispatchError('unable_to_upload');
        logger.type('upload-file-helper').warn('Reader failed to read the file: ', file_url);
      };
      reader.onload = function(e) {
        let blob = new Blob([e.srcElement.result], {type: response.type});
        cb(blob, file_name, source);
        logger.type('upload-file-helper').info('Blob from image received via xhr: ', file_url);
      };
    };

    xhr.send();
  }

  _getDataByLoadingImage(cb, source, file_name, file_url, append_url = true){

    let extension = utils.file.get_extension(file_url) || 'png',
        mimeType = `image/${extension}`;

    let img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {

      let canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      let ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      let imd = canvas.toDataURL(mimeType),
        blob = utils.file.base64_to_blob(imd);

      cb(blob, file_name, source);
      logger.type('upload-file-helper').info('Blob from image received: ', file_url);
    };

    img.onerror = () => {
      if (append_url) {
        logger.type('upload-file-helper').warn('Image failed to load: ', file_url);
        ChatInputActions.appendMessage({text: `${file_url}`});
      } else {
        logger.type('upload-file-helper').warn('Url failed to load: ', file_url);
      }
    };

    img.src = file_url;
  }

  _tryUrlByLoadingImage(url){
    this._getDataByLoadingImage(this._handleBlobLoaded.bind(this), "dragndrop", false, url, true);
  }

  _handleBlobLoaded(blob, name, source) {
    if (blob) {
      var file;
      if (!name) {
        name = `${chatInputStrings.upload_default_name}.${utils.file.get_extension_for_mime_type(blob.type)}`;
      }

      file = utils.file.blob_to_file(blob, name);
      this._handleFileForChatInput(file, name, source);
    }
  }

  _onFileChosen(e, source = "browse") {
    var file,
        name;

    if (e.type === 'change') {
      file = e.target.files[0];
      name = _.get(file, "name");
    } else if (e.type === 'drop') {
      file = e.dataTransfer.files[0];
      name = _.get(file, "name");
    } else if (e.type === 'paste') {
      var dataTransferItem = e.clipboardData.items[0];
      if (dataTransferItem) {
        file = dataTransferItem.getAsFile();
        var ext = utils.file.get_extension_for_mime_type(dataTransferItem.type);
        if (ext) {
          name = `${chatInputStrings.upload_default_name}.${ext}`;
        }
      }
    }

    if (file && name && source) {
      this._handleFileForChatInput(file, name, source);
    }
    api.focusChatInput();
  }

  _handleFileForChatInput(file, name, source) {
    if (file) {
      file.file_obj = null;
      ChatInputActions.expandAttachment({
        jid: this.active_chat,
        file_name: name,
        file: file,
        file_selection_source: source
      });
      this._processFile(file, name, source);
    }
  }

  _openTooltip(file, name, source, fileObj) {
      file.file_obj = fileObj;

      ChatInputActions.openTooltip({
        type: 'upload_preview',
        data: {
          file: fileObj
        }
      });

      ChatInputActions.expandAttachment({
        jid: this.active_chat,
        file_name: name,
        file: file,
        file_selection_source: source
      });
  }

  _processFile(file, name, source) {
    let fileTypeBreakdown = utils.file.get_selected_file_type(file),
        file_type = fileTypeBreakdown.major,
        subtype = fileTypeBreakdown.minor,
        client_subtype = ConfigStore.get("client_subtype"),
        isQT = utils.clientSubType.isQT(client_subtype),
        isWindows = utils.platform.isWindows(),
        isSafari = utils.browser.is.safari();

    file_type = this._determineFileType(file_type, subtype);

    if (this._validateFile(file) && this._shouldOpenFilePreview(file_type)) {
      let fileObj = {
        file_type
      };

      fileObj.src = window.URL.createObjectURL(file);

      if(file_type === 'image') {
        utils.image.resizeImage(fileObj.src).then((processedFile) => {
          fileObj.src_processed = window.URL.createObjectURL(processedFile);
          this._openTooltip(file, name, source, fileObj);
        });
      } else if (file_type === 'video') {
        if (!(isWindows && isQT) && (subtype === 'mp4' || (subtype === 'quicktime' && isSafari))) {
          this._openTooltip(file, name, source, fileObj);
        }
      } else {
        this._openTooltip(file, name, source, fileObj);
      }
    }
  }

  _validateFile(file, max_upload_size = AppConfig.max_upload_size) {
    let result;
    if (file.size && file.size / 1024 / 1024 > max_upload_size) {
      this._dispatchError('file_too_large');
      result = false;
    } else {
      this._readFile(file);
      result = true;
    }
    return result;
  }

  _validateFileUrl(url) {
    let result;
    if (_.isString(url) && utils.file.get_file_name(url) && url.slice(-1) !== "/") {
      result = true;
    } else {
      this._dispatchError('file_is_folder');
      result = false;
    }
    return result;
  }

  _readFile(file, reader = new FileReader()) {
    reader.onload = () => {
      this._clearErrors();
    };
    reader.onerror = () => {
      this._dispatchError('file_is_folder');
    };
    reader.readAsText(file);
  }

  _shouldOpenFilePreview(file_type) {
    return _.includes(['image', 'video', 'audio'], file_type);
  }

  _determineFileType(file_type, subtype) {
    if (subtype){
      if (subtype === 'pdf') {
        file_type = 'text';
      } else if (_.includes(['xml', 'html', 'rtf'], subtype) || _.includes(subtype, 'photoshop')) {
        file_type = 'application';
      }
    }
    return file_type;
  }

  _openFilePicker() {
    var node = document.getElementById('fileInput');
    if (node) {
      node.click();
    }
    spi.showFileChooser();
  }

  _clearErrors() {
    FileUploaderActions.clearFileErrors({jid: this.active_chat});
  }

  _dispatchError(key, jid) {
    FileUploaderActions.dispatchFileError({jid: jid || this.active_chat, key: key});
  }

}

module.exports = UploadFileHelper;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/upload_file_helper.js
 **/