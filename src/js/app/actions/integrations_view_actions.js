import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import AppConfig from 'config/app_config';
import IntegrationHelper from 'helpers/integration_helper';
import logger from 'helpers/logger';
import Utils from 'helpers/utils';
import URITemplate from 'helpers/uri_template';

module.exports = {

  fetchSignedUrlConditionally: function(extension, room_id, urlTemplateValues) {
    if (extension.authentication === 'none') {
      let template = new URITemplate(extension.url);
      let url = template.replaceVariables(urlTemplateValues);
      AppDispatcher.dispatch('signed-extension-url-fetched', {
        extension: extension,
        room_id: room_id,
        signed_url: Utils.addConnectApiVersionToUrl(url)
      });
    } else {
      this.fetchSignedUrl(extension, room_id, urlTemplateValues);
    }
  },

  fetchSignedUrl: function (extension, room_id, urlTemplateValues) {

    AppDispatcher.dispatch('signed-extension-url-fetching', {
      extension: extension,
      room_id: room_id,
      url_template_values: urlTemplateValues
    });

    this.fetchSignedUrlWithResult(extension, room_id, urlTemplateValues, (data, result) => {
      if (!data || data.error || result.status >= 400) {
        logger.error('[HC-Integrations]', `Could not get a signed URL for ${extension.full_key}.`);
        AppDispatcher.dispatch('signed-extension-url-error', {
          extension: extension,
          room_id: room_id,
          error: _.get(data, "error", "Error fetching signed url"),
          status: result.status
        });
      } else {
        let location = Utils.addConnectApiVersionToUrl(data.location);
        AppDispatcher.dispatch('signed-extension-url-fetched', {
          extension: extension,
          room_id: room_id,
          signed_url: location
        });
      }
    });
  },

  fetchSignedUrlWithResult: function (extension, room_id, urlTemplateValues, callback) {
    AppDispatcher.dispatch('API:get-signed-url', {
        extension: extension,
        room_id: room_id,
        timeout: AppConfig.integrations.signed_url_timeout
      },
      urlTemplateValues || {},
      callback
    );
  },

  iframeLoaded: function (data) {
    AppDispatcher.dispatch('integration-iframe-loaded', {
      integration: data.integration,
      room_id: data.room_id
    });

    AnalyticsDispatcher.dispatch('analytics-event', {
      name: "hipchat.client.integrations.view.iframe.loaded",
      properties: {
        room_id: data.room_id,
        addon_key: data.integration.addon_key,
        full_key: IntegrationHelper.to_full_key(data.integration.addon_key, data.integration.key),
        duration: data.duration
      }
    });
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/integrations_view_actions.js
 **/