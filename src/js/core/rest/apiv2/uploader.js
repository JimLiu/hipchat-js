import utf8 from 'utf8';
import logger from 'helpers/logger';
import { EventEmitter } from 'events';

export default {

  /**
   * Returns a promise that will resolve with the given `file`'s contents
   *
   * @param {string} file The path to the file to read
   * @returns {Promise} A promise that will be resolved/rejected based on the outcome of the the read.
   */
  _readFile(file) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();

      reader.onloadend = () => {
        if (reader.error) {
          reject(reader.error);
        } else {
          resolve(reader.result);
        }

        reader.onloadend = null; // Cleanup
      };

      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Builds the contents of a file message for multi-part XHR upload
   *
   * @param {ArrayBuffer} config.fileContent The content for the request body
   * @param {string} config.fileType The MIME type for the file to upload
   * @param {string} config.fileName The name of the file to upload
   * @param {string} config.message The message content
   * @param {string} boundary The boundary string for separating the parts of the requeset body
   * @returns {Blob} A blob of the message and file, in the multi-part format
   */
  _getRequestBody({fileContent, fileType, fileName, message}, boundary) {
    let data = new Uint8Array(fileContent), // Wrap in view to get data
        type = (fileType === 'application/json') ? 'text/plain' : fileType, // with new API request can't contains two application/json parts.
        before = utf8.encode([
          `--${boundary}`,
          '\r\n',
          'Content-Type: application/json; charset=UTF-8',
          '\r\n',
          'Content-Disposition: attachment; name="metadata"',
          '\r\n\r\n',
          JSON.stringify({message: message}),
          '\r\n',
          `--${boundary}`,
          '\r\n',
          `Content-Type: ${type}`,
          '\r\n',
          `Content-Disposition: attachment; name="file"; filename="${fileName}"`,
          '\r\n\r\n'
        ].join('')),
        after = `\r\n--${boundary}--`,
        size = before.length + data.byteLength + after.length,
        arrayBuffer = new ArrayBuffer(size),
        uint8array = new Uint8Array(arrayBuffer, 0),
        i = 0,
        j = 0;

    // Append the string.
    for (; i < before.length; i++) {
      uint8array[i] = before.charCodeAt(i) & 0xff;
    }

    // Append the binary data.
    for (j = 0; j < data.byteLength; i++, j++) {
      uint8array[i] = data[j];
    }

    // Append the remaining string
    for (j = 0; j < after.length; i++, j++) {
      uint8array[i] = after.charCodeAt(j) & 0xff;
    }

    return new Blob([arrayBuffer]);
  },

  /**
   * Returns the appropriate event source for XHR uploads. This is a cross-browser
   * solution to capturing 'progress' events.
   *
   * @param {XMLHttpRequest} xhr The XHR instance to normalize
   * @returns {EventTarget} The appropriate target for 'progress' events
   */
  _getXHREventSource(xhr) {
    return xhr.upload || xhr;
  },

  /**
   * Listens for events on the given `xhr` and translates them to events on the
   * given `emitter`.
   *
   * @param {XMLHttpRequest} xhr The XHR instance to listen on
   * @param {EventEmitter} emitter The EventEmitter instance to dispatch from
   */
  _registerXHREvents(xhr, emitter) {
    let eventSource = this._getXHREventSource(xhr),
        cleanup,
        onProgress,
        onReadyStateChange,
        onError;

    onProgress = (e) => {
      let position = e.position || e.loaded,
          total = e.totalSize || e.total,
          percentage = position / total;

      emitter.emit('progress', percentage);
    };

    onReadyStateChange = () => {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status === 204){
        emitter.emit('success');
      } else {
        let error = {
          code: xhr.status,
          message: "Unexpected error!"
        };

        if (xhr.responseXML && xhr.responseXML.getElementsByTagName('error').length) {
          error = xhr.responseXML.getElementsByTagName('error')[0].firstChild.nodeValue;
        }

        try {
          let response = JSON.parse(xhr.response);
          if (response.error){
            error = response.error;
          }
        } catch (e) {
          logger.error(e);
        }

        emitter.emit('error', error);
      }

      cleanup();
    };

    onError = (error) => {
      emitter.emit('error', error);
      cleanup();
    };

    cleanup = () => {
      eventSource.removeEventListener('progress', onProgress);
      xhr.removeEventListener('readystatechange', onReadyStateChange);
      xhr.removeEventListener('error', onError);
      xhr.blob = null;
      emitter.emit('complete');
    };

    eventSource.addEventListener('progress', onProgress);
    xhr.addEventListener('readystatechange', onReadyStateChange);
    xhr.addEventListener('error', onError);
  },

  /**
   * Creates and configures the XHR to post the file message to the API.
   *
   * @param {object} messageData
   * @param {String} config.fileName The name of the file
   * @param {String} config.fileType The MIME type of the file
   * @param {ArrayBuffer} config.fileContent The result of reading the file via FileReader::readAsArrayBuffer
   * @param {String} config.message The message to be sent with the file
   * @param {object} requestData
   * @param {String} requestData.boundary The boundary delimiter for the multi-part request
   * @param {String} requestData.token The API token to use for the request
   * @param {String} conrequestDatafig.url The URL to post the request to
   * @param {XMLHttpRequest} xhr The XHR instance to be sent
   * @param {EventEmitter} emitter The EventEmitter to dispatch against
   */
  _sendRequest(messageData, requestData, xhr, emitter) {
    xhr.open('POST', requestData.url, true);
    xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${requestData.boundary}; charset=UTF-8`);
    xhr.setRequestHeader('Authorization', `Bearer ${requestData.token}`);
    xhr.blob = this._getRequestBody(messageData, requestData.boundary);

    this._registerXHREvents(xhr, emitter);

    xhr.send(xhr.blob);
  },

  /**
   * Uploads file with HipChat V2 API. Returns an EventEmitter that dispatches:
   * - 'progress' : Fired as the XHR 'progress' event fires, passes along the percentage
   *                of the file that has been uploaded
   * - 'success'  : Fired if the upload is successful
   * - 'error'    : Fired if the upload fails, passes along the error
   * - 'complete' : Fired after the upload, whether it succeeded or failed
   *
   * @param {string} url Url for upload file
   * @param {object} config Parameters
   * @param {String} config.token Token for authorization
   * @param {object} config.file File object
   * @param {String} config.fileName File name
   * @param {String} config.message Message sent with file
   * @returns {EventEmitter} An emitter that dispatches events about the upload
   */
  uploadFile(url, {token, file, fileName, message}) {
    let emitter = new EventEmitter(),
        xhr = new XMLHttpRequest(),
        boundary = `hcb_${Math.random().toString(36).substring(7)}`;

    this._readFile(file)
      .then((fileContent) => {
        this._sendRequest({
          fileContent,
          fileName,
          fileType: file.type,
          message
        }, {
          boundary,
          token,
          url
        }, xhr, emitter);
      })
      .catch(error => {
        emitter.emit('error', error);
        emitter.emit('complete');
      });

    return emitter;
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/core/rest/apiv2/uploader.js
 **/