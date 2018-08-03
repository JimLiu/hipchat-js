var Store = require("lib/core/store"),
  AppDispatcher = require("dispatchers/app_dispatcher"),
  IntegrationHelper = require("helpers/integration_helper");

class IntegrationsViewStore extends Store {

  getDefaults() {
    return {
    };
  }

  registerListeners() {
    AppDispatcher.register({
      "signed-extension-url-fetching": (data) => {
        this.set(this.fullKey(data.room_id, data.extension.full_key), {
          signed_url: null,
          signed_url_loading: true,
          url_template_values: data.url_template_values,
          error: null,
          is_error: false
        });
      },
      "signed-extension-url-fetched": (data) => {
        this.set(this.fullKey(data.room_id, data.extension.full_key), {
          signed_url: data.signed_url,
          signed_url_loading: false
        });
      },
      "signed-extension-url-error": (data) => {
        let fullKey = this.fullKey(data.room_id, data.extension.full_key);
        let url_template_values = _.get(this.get(fullKey), "url_template_values", {});
        this.set(fullKey, {
          error: data.error,
          is_error: true,
          status: data.status,
          signed_url: null,
          signed_url_loading: false,
          url_template_values: url_template_values
        });
      },
      "integration-iframe-loaded": (data) => {
        var integration_full_key = IntegrationHelper.to_full_key(data.integration.addon_key, data.integration.key);
        var fullKey = this.fullKey(data.room_id, integration_full_key);
        this.set(fullKey, _.extend({
          frame_loading: false
        }, this.get(fullKey)));
      }
    });
  }

  onIntegrationViewStatusChange(room_id, extension_full_key, callback) {
    let key = this.fullKey(room_id, extension_full_key);
    this.on(`change:${key}`, callback);
  }

  offIntegrationViewStatusChange(room_id, extension_full_key, callback) {
    let key = this.fullKey(room_id, extension_full_key);
    this.off(`change:${key}`, callback);
  }

  getIntegrationViewStatus(room_id, extension_full_key) {
    let key = this.fullKey(room_id, extension_full_key);
    return this.get(key);
  }

  fullKey(room_id, extension_full_key) {
    return `${room_id}:${extension_full_key}`;
  }

}

module.exports = new IntegrationsViewStore();


/** WEBPACK FOOTER **
 ** ./src/js/app/stores/integrations_view_store.js
 **/