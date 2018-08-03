import ReadStateError from './readstate_error';
import ConfigStore from 'stores/configuration_store';
import logger from 'helpers/logger';
import moment from 'moment';

class ReadStateRequest {

  /**
   * Handles making the various API requests for readstate.
   * @param {String} HTTP request method
   * @param {String} API request URL
   * @param {Object|null} request body
   * @param {Function} callback function
   * @param {Object} XMLHttpRequest object (not used, passed-in to facilitate testing)
   * @return {Object} XMLHttpRequest object
   */
  request(method, url, data = null, callback = ()=>{}, xhr = new XMLHttpRequest()) {
    if (!method || !url) { return; }

    var handler = (evt) => {
          var req = evt.target,
              { err, body, res } = this.handleResponse(req);

          if (typeof callback === 'function') {
            callback(err, body, res);
          }
        };

    xhr.open(method, url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + ConfigStore.getOAuthToken());
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    if (method.toUpperCase() === 'PATCH') {
      xhr.setRequestHeader('Content-Type', 'application/json-patch+json');
    } else {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }

    xhr.addEventListener('load', handler);
    xhr.addEventListener('error', handler);
    xhr.addEventListener('abort', handler);
    xhr.addEventListener('timeout', handler);

    if (data) {
      data = JSON.stringify(data);
    }

    xhr.send(data);
    return xhr;
  }

  getUrl(withCounts) {
    var host = ConfigStore.get('api_host'),
        query = withCounts ? '?expand=items.unreadCount' : '';

    return `https://${host}/v2/readstate${query}`;
  }

  /**
   * Gets the user's readstate data from the Coral v2 API.
   * @param {Function} callback function
   * @param {Boolean} return unread counts
   * @return {Object} XMLHttpRequest object
   */
  get(callback, withCounts = true) {
    var url = this.getUrl(withCounts);
    logger.log('[ReadStateRequest] Initiating get request', url);
    return this.request('GET', url, null, callback);
  }

  /**
   * Updates the user's readstate data in the Coral v2 API.
   * @param {Object} readstate patch object
   * @param {Function} callback function
   * @param {Boolean} return unread counts
   * @return {Object} XMLHttpRequest object
   */
  patch(data, callback, withCounts = false) {
    var url = this.getUrl(withCounts);
    return this.request('PATCH', url, data, callback);
  }

  /**
   * Processes the `xhr`'s status and response. Returns an object
   * with `err` and `body` properties which are populated as needed.
   * @param {Object} XMLHttpRequest object
   * @return { err: String, body: Object|null, res: Object }
   */
  handleResponse(xhr) {
    let err = ReadStateError.handleRequestErrors(xhr.status),
        serverDate = xhr.getResponseHeader('Date'),
        serverFormat = 'ddd, D MMM YYYY H:mm:ss',
        res = {
          status: xhr.status,
          backoff: xhr.getResponseHeader('X-Backoff'),
          rateLimitReset: Number(xhr.getResponseHeader('X-RateLimit-Reset')),
          serverTime: serverDate ? Number(moment.utc(serverDate, serverFormat).unix()) : null
        },
        body;

    // Response may not be valid JSON
    try {
      body = JSON.parse(xhr.responseText);
    } catch (e) {
      body = null;
    }

    return { err, body, res };
  }
}

export default ReadStateRequest;



/** WEBPACK FOOTER **
 ** ./src/js/core/rest/readstate/readstate_request.js
 **/