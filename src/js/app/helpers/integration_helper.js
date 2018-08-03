import AppConfig from 'config/app_config';
import {
  getClientLocationId
} from 'helpers/client_info_helper';
import URITemplate from "./uri_template";

export default {

  /*
   * Source IDs as per https://extranet.atlassian.com/display/HC/Add-on+Management+Analytics
   */
  CONFIGURE_LINK_SOURCE_ID: 5,
  DIALOG_LINK_SOURCE_ID: 6,
  API_SOURCE_ID: 7,

  to_full_key: function(addon_key, module_key) {
    return `${addon_key}:${module_key}`;
  },

  is_full_key: function(key) {
    return key.indexOf(":") !== -1;
  },

  split_full_key: function(key) {
    return key.split(":");
  },

  isFeatureEnabled: function(initData) {
    let isGuest = initData && initData.is_guest;
    return !isGuest && (_.get(initData, 'feature_flags.web_client_integrations') || _.get(initData, "perms.hipconnect") === "all");
  },

  /**
   * Check if an integration key is the same as an internal integration
   *
   * It is currently possible to fake this key, so it should not be used for anything requiring security
   *
   * @param key
   * @returns {boolean}
   */
  isInternalIntegrationKey: function(key) {
    return _.includes([AppConfig.links_glance.full_key, AppConfig.files_glance.full_key, AppConfig.people_glance.full_key], key);
  },

  /**
   * This routine returns a URL to the integrations management page.
   * @param baseUrl the base URL where the connected instance of HipChat is running.
   * @param roomId the ID of the room that the integration manager should use for its context.
   * @param userId the ID of the current user.
   * @param sourceId an ID representing the 'source' by which the user arrives at the integration
   * management page. See https://extranet.atlassian.com/display/HC/Add-on+Management+Analytics.
   * @returns {string} a URL to the integration manager.
   */
  getIntegrationsUrl: function(baseUrl, roomId, userId, sourceId) {
    var fromLocationId = getClientLocationId();
    if (!sourceId) {
      sourceId = 0;
    }
    let str_formats = {
      'base_url': baseUrl,
      'room_id': roomId,
      'user_id': encodeURIComponent(userId),
      'from_location_id': fromLocationId,
      'source_id': sourceId
    };

    let template = new URITemplate(AppConfig.integrations_url);
    return template.replaceVariables(str_formats);
  },

  getIntegrationsBaseUrl: function(baseUrl) {
    let str_formats = {
      'base_url': baseUrl
    };

    let template = new URITemplate(AppConfig.integrations_base_url);
    return template.replaceVariables(str_formats);
  },

  getIntegrationsConfigUrl: function(baseUrl, roomId, addon_key) {
    let str_formats = {
      'base_url': baseUrl,
      'room_id': roomId,
      'addon_key': addon_key
    };

    let template = new URITemplate(AppConfig.integrations_config_url);
    return template.replaceVariables(str_formats);
  },

  getIntegrationsUpdateUrl: function(baseUrl, roomId, addon_key) {
    let str_formats = {
      'base_url': baseUrl,
      'room_id': roomId,
      'addon_key': addon_key
    };

    let template = new URITemplate(AppConfig.integrations_update_url);
    return template.replaceVariables(str_formats);
  },

  extractIntegrationParametersFromMessage: function(msg) {
    var parameters = {};
    if (msg) {
      parameters = {
        body: msg.body,
        sender: {
          id: msg.sender_id,
          name: msg.sender,
          mention: msg.sender_mention
        },
        mid: msg.mid,
        type: msg.type,
        metadata: _.get(msg, 'metadata', {})
      };

      if (msg.card) {
        parameters.card = _.pick(msg.card, ['title', 'description', 'url']);
      }

      if (msg.file_data) {
        parameters.media = {
          type: _.get(msg.file_data,'file_type', 'unknown').replace('img', 'image'),
          name: _.get(msg.file_data,'name',''),
          size: msg.file_data.size,
          url: msg.file_data.url
        };
        if (msg.file_data.thumb_url) {
          parameters.media.thumb_url = msg.file_data.thumb_url;

        }
      }

      if (msg.link_details) {
        parameters.media = {
          type: msg.link_details.type,
          url: msg.link_details.url
        };
      }
    }
    return parameters;
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/integration_helper.js
 **/