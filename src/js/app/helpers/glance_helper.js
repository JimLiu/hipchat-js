import GlanceActions from "actions/glance_actions";
import Utils from "helpers/utils";
import AppDispatcher from "dispatchers/app_dispatcher";
import AppConfig from "config/app_config";
import {Validator as JSONValidator} from 'jsonschema';
import glanceMetadataJsonSchema from 'schemas/glance_metadata.json';
import logger from 'helpers/logger';
import IntegrationHelper from "helpers/integration_helper";

let jsonValidator = new JSONValidator();

class GlanceHelper {
  fetchGlanceMetadataForRoom(room_id) {

    let startTimestamp = Utils.timings.now();

    AppDispatcher.dispatch('API:fetch-all-glances-for-room', {
      room_id: room_id,
      timeout: AppConfig.integrations.glance_remote_metadata_timeout
    }, (fetch_result) => {
      fetch_result.then((glances) => {
        glances.forEach(({promise, key}) => {
          GlanceActions.glanceMetadataLoading(room_id, key);
          promise.then(({path, data, result}) => {
            let glance = this._createGlanceFromKey(key, path);
            this._processGlanceReturnedData(room_id, glance, data, result, startTimestamp);
          });
        });
        GlanceActions.roomFinishedLoading(room_id, true);
      }).catch((err) => {
        logger.warn('[HC-Integrations]', `Failed to fetch signed url for room ${room_id} ${err}`);
        GlanceActions.roomFinishedLoading(room_id, false);
      });
    });
  }


  fetchGlanceRemoteMetadata(room_id, glance) {
    let startTimestamp = Utils.timings.now();
    AppDispatcher.dispatch('API:request-with-signed-url', {
      extension: glance,
      attribute: 'query_url',
      room_id: room_id,
      timeout: AppConfig.integrations.glance_remote_metadata_timeout
    }, {}, (data, result) => {
      this._processGlanceReturnedData(room_id, glance, data, result, startTimestamp);
    });
  }

  _processGlanceReturnedData(room_id, glance, data, result, startTimestamp) {
    let duration = Math.floor(Utils.timings.now() - startTimestamp);
    if (!data || data.error || result.status >= 400) {

      GlanceActions.glanceMetadataError(room_id, glance, "Could not load data for this glance.", duration);

    } else {
      if (!this._validateMetadataFromRemote(data, glance)) {
        GlanceActions.glanceMetadataError(room_id, glance, "Could not validate data for this glance.", duration);
        return;
      }

      GlanceActions.glanceMetadataFetched(room_id, glance, data, duration);
    }
  }

  _validateMetadataFromRemote(data, glance) {
    var result = jsonValidator.validate(data, glanceMetadataJsonSchema);
    if (result.errors.length > 0) {
      logger.warn('[HC-Integrations]', `Invalid schema from ${glance.query_url} for Glance ${glance.full_key}: ${result}`);
      return false;
    }

    return true;
  }

  _createGlanceFromKey(key, path) {
    return {full_key: key, query_url: path, addon_key: IntegrationHelper.split_full_key(key)[0]};
  }

}

export default new GlanceHelper();


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/glance_helper.js
 **/