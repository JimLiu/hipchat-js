var AppDispatcher = require('dispatchers/app_dispatcher'),
  AnalyticsDispatcher = require('dispatchers/analytics_dispatcher'),
  logger = require('helpers/logger');


export default {

  fetchGlanceMetadata: function (room_id, glance, reload_errors = false) {
    AppDispatcher.dispatch('fetch-glance-metadata', room_id, glance, reload_errors);
  },

  glanceMetadataLoading: function (room_id, glance_key) {
    AppDispatcher.dispatch('glance-metadata-loading', room_id, glance_key);
  },

  glanceMetadataFetched: function (room_id, glance, data, duration) {
    AppDispatcher.dispatch("glance-metadata-fetched", room_id, glance.full_key, data);

    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.integrations.glance.fetch.success",
      properties: {
        room_id: room_id,
        addon_key: glance.addon_key,
        glance_full_key: glance.full_key,
        duration: duration
      }
    });
  },

  glanceMetadataError(room_id, glance, error, duration) {
    logger.warn('[HC-Integrations]', error);

    AppDispatcher.dispatch('glance-metadata-fetched', room_id, glance.full_key, {
      error: error
    });

    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.integrations.glance.fetch.error",
      properties: {
        room_id: room_id,
        addon_key: glance.addon_key,
        glance_full_key: glance.full_key,
        error: error,
        duration: duration
      }
    });
  },

  roomFinishedLoading: function (room_id, success) {
    AppDispatcher.dispatch('glances-finished-loading-for-room', room_id, success);
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/glance_actions.js
 **/