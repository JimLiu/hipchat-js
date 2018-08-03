/*global escape*/
import fileUploader from './uploader';
import ConfigStore from 'stores/configuration_store';
import logger from 'helpers/logger';
import version_info from '../../../app/version-info.json';
import utils from 'helpers/utils';
import URITemplate from 'helpers/uri_template';

const MAX_URL_LENGTH = 2048;
const CONNECT_API_VERSION = version_info.connect_api_version;

class HCApiClient {

  constructor() {
    this.room = {

      /**
       * @deprecated
       */
      recent_history: (data, callback) => {
        this.request('GET', `room/${data.path.identifier}/history/latest`, data.params, callback);
      },

      /**
       * Looks to be unused
       * @deprecated
       */
      invite_users: (data, callback) => {
        this.request('POST', `room/${data.path.identifier}/invite/${data.user_id}`, data.params, callback);
      },

      /**
       * @deprecated
       */
      update_room: (data, callback) => {
        this.request('PUT', `room/${data.path.identifier}`, data.params, callback, true);
      },

      /**
       * @deprecated
       */
      share_file: (data) => {
        data.params.token = ConfigStore.getOAuthToken();
        return fileUploader.uploadFile(this.getUrl(`room/${data.path.identifier}/share/file`), data.params);
      }
    };

    this.user = {

      /**
       * @deprecated
       */
      recent_history: (data, callback) => {
        this.request('GET', `user/${data.path.identifier}/history/latest`, data.params, callback);
      },

      /**
       * @deprecated
       */
      share_file: (data) => {
        data.params.token = ConfigStore.getOAuthToken();
        return fileUploader.uploadFile(this.getUrl(`user/${data.path.identifier}/share/file`), data.params);
      },

      /**
       * @deprecated
       */
      send_private_message: (data) => {
        this.request('POST', `user/${data.path.identifier}/message`, data.params, _.noop, true);
      }
    };

    this.integrations = {

      /**
       * @deprecated
       */
      sync: (data, callback) => {

        function createSyncBody(integrations, room_ids) {
          let req = {
            'knownIntegrations': {},
            'connectApiVersion': CONNECT_API_VERSION
          };

          _.each(room_ids || [], (room_id) => {
            req.knownIntegrations[room_id] = {};
          });

          // for each room
          _.each(integrations, (addons, roomId) => {
            // Only sync rooms we are actually wanting to sync, not for all rooms in store
            if (!_.includes(room_ids, roomId)) { return; }

            req.knownIntegrations[roomId] = {};

            // for each add-on in the room
            _.each(addons, (addon) => {
              req.knownIntegrations[roomId][addon.addon_key] = addon.version;
            });
          });
          return req;
        }

        let str_room_ids = _.map(data.room_ids, room_id => String(room_id));
        let body = createSyncBody(data.integrations, str_room_ids);

        this.request('POST', 'addon/sync', body, callback, true);
      },

      /**
       * @deprecated
       */
      getSignedUrl: (requestData, parameters, callback) => {
        this.integrations._signedUrl(requestData, parameters, callback);
      },

      /**
       * @deprecated
       */
      requestWithSignedUrl: (requestData, parameters, callback) => {
        this.integrations._signedUrl(requestData, parameters, (data, result) => {
          let location = data ? data.location : null;
          if (!location) {
            callback(data, result);
          } else {
            location = utils.addConnectApiVersionToUrl(location);
            this.requestUrl('GET', location, null, null, callback, null, data.timeout);
          }
        });
      },

      fetchAllGlancesForRoom: (requestData, callback) => {
        let resultPromise = new Promise((resolve, reject) => {
          this.integrations._allSignedGlances(requestData, (data, result) => {
            if (!data || data.error || result.status >= 300) {
              let error = (data && data.error) ? data.error : `(status code: ${result.status})`;
              reject(error);
            } else {
              let promises = _.map(data, (glance_result, key) => {
                let promise = new Promise((mapResolve, mapReject) => {
                  if (!glance_result.success) {
                    logger.warn('[HC-Integrations]', `Failed to fetch signed url for Glance ${key}`);
                    let path = null;
                    mapResolve({path, data, result});
                  } else {
                    let glance_url = utils.addConnectApiVersionToUrl(glance_result['url']);
                    this.requestUrl('GET', glance_url, null, null, (req_data, req_result) => {
                      mapResolve({
                        path: glance_url,
                        data: req_data,
                        result: req_result
                      });
                    });
                  }
                });
                return {promise, key};
              });

              resolve(promises);
            }
          });
        });

        callback(resultPromise);
      },

      _signedUrl: (data, parameters, callback) => {
        let ext = data.extension;
        let attribute = data.attribute || "url";

        let usedParameters = {};
        let url = data.extension[attribute];
        if (url) {
          let template = new URITemplate(url);
          usedParameters = template.getTemplateValuesFromParameters(parameters);
        }

        let mod_type = `${attribute}@${ext.type}`;
        let path = `addon/signed-url/${data.room_id}/${ext.addon_key}/${mod_type}/${ext.key}/${ext.addon_timestamp}`;
        this.request('GET', path, usedParameters, callback, null, data.timeout);
      },

      _allSignedGlances: (data, callback) => {
        this.request('GET', `addon/signed-urls/${data.room_id}/glances`, {}, callback, null, data.timeout);
      }
    };
  }

  getAPIRoot() {
    var api_host = ConfigStore.get('api_host');
    return `https://${api_host}/v2/`;
  }

  url(url_path, data) {
    /**
     * A UTF-8 compatible version of deprecated encode
     */
    function encodePath(path_to_encode){
      var newPath = "",
      additionallyEncode = ['?','&'];

      if(typeof path_to_encode === "string"){
        newPath = encodeURI(path_to_encode);
        additionallyEncode.forEach((charToEncode) => {
          newPath = newPath.replace(new RegExp('\\' + charToEncode, 'g'), encodeURIComponent(charToEncode));
        });
        return newPath;
      }
    }

    var url = this.getAPIRoot() + encodePath(url_path),
        values = [],
        queryString = function (query) {
          for (var key in query) {
            if (query[key]) {
              values.push(encodeURIComponent(key) + '=' + encodeURIComponent(query[key]));
            }
          }
          return values.length ? '?' + values.join('&') : '';
        };

    if (!data) {
      return url;
    } else if (typeof data === 'object') {
      data = _.omitBy(data, (val) => { return !val; });
      return url + queryString(data);
    }
  }

  getUrl(path, payload, postJSON) {
    if (postJSON) {
      return this.url(path);
    }
    return this.url(path, payload);
  }

  request(method, path, payload, callback, postJSON, timeout) {
    let url = this.getUrl(path, payload, postJSON);
    if (url.length > MAX_URL_LENGTH) {
      logger.warn(`Unsafe URL length (${url.length}): ${url}`);
    }
    this.requestUrl(method, url, ConfigStore.getOAuthToken(), payload, callback, postJSON, timeout);
  }

  requestUrl(method, url, token, payload, callback, postJSON, timeout) {
    var options = {
          url: url,
          type: method
        };

    if (timeout) {
      options["timeout"] = timeout;
    }

    if (postJSON) {
      options["contentType"] = "application/json";
      options["data"] = JSON.stringify(payload);
    }

    if (token) {
      options["beforeSend"] = (request) => {
        request.setRequestHeader("Authorization", "Bearer " + token);
      };
    }

    $.ajax(options)
      .done((data, textStatus, jqXHR) => {
       this.handleResponse(jqXHR, callback);
      })
      .fail((jqXHR) => {
        this.handleResponse(jqXHR, callback);
      });
  }

  handleResponse(xhr, callback) {
    var response = xhr.responseText;
    if (_.isString(response) && response !== "") {
      try {
        response = JSON.parse(response);
      } catch (e) {
        response = {
          error: e
        };
      }
    }
    callback(response, xhr);
  }
}

export default new HCApiClient();



/** WEBPACK FOOTER **
 ** ./src/js/core/rest/apiv2/apiV2.js
 **/