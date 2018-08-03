import DAL from 'core/dal';
import AppConfig from 'config/app_config';

class IntegrationsStorage {

  constructor() {
    this.ready = false;
  }

  _getDefaults() {
    return {
      "versions": {}
    };
  }

  /**
   * Write integrations to storage
   * @param integrations
   * @returns compressed integrations
   */
  save(integrations) {
    integrations = this._deflate(integrations);
    integrations = this._bisect(integrations, 0, _.keys(integrations.versions).length, AppConfig.integrations.persistent_store_max_size_bytes);

    this.integrations = integrations;
    if (this.ready) {
      DAL.Cache.set(DAL.Cache.Keys.INTEGRATIONS, this.integrations);
    }
    return integrations;
  }

  /**
   * Get uncompressed integrations from storage
   * @returns {Promise} uncompressed integrations
   */
  getIntegrations() {
    if (this.ready) {
      return DAL.Cache.get(DAL.Cache.Keys.INTEGRATIONS).then((integrations) => {
        let data = integrations || this._getDefaults();
        return this._inflateIntegrations(data);
      });
    }
    return Promise.resolve(this._getDefaults());
  }

  reset() {
    if (this.ready) {
      DAL.Cache.unset(DAL.Cache.Keys.INTEGRATIONS);
    }
  }

  /**
   * remove integrations from rooms that are not in versions
   */
  _cleanRooms(integrations){
    let room_integrations = _.clone(integrations);
    delete room_integrations.versions;

    let versions = _.keys(integrations.versions);
    _.each(room_integrations, (integrations_in_room, room) => {
      room_integrations[room] = _.intersection(versions, integrations_in_room);
    });
    room_integrations.versions = integrations.versions;
    return room_integrations;
  }

  /**
   * give a length of an object once it has been stored
   */
  _objectLength(obj) {
    let str = JSON.stringify(obj);
    // UTF-16 means x2.
    return str.length * 2;
  }

  /**
   * modify the integrations if there is insufficient space
   *
   * @param integrations
   * @param min
   * @param max
   * @returns {Object} modifiedIntegrations
   * @private
   */
  _bisect(integrations, min, max, max_bytes) {
    let sliced_integrations = integrations;
    let max_integrations;

    let get_sliced_integrations = function(room_integrations, end) {
      let versions = room_integrations.versions;

      let keys_arr = _.keys(versions);
      let version_keys = keys_arr.slice(0, end);
      let new_integrations = _.clone(room_integrations, true);

      //pick off unused keys
      new_integrations.versions = _.pick(versions, version_keys);

      // remove unused keys from rooms
      return this._cleanRooms(new_integrations);
    };

    while(max > min + 1) {
      let index = min + Math.floor((max - min) / 2);

      sliced_integrations = get_sliced_integrations.call(this, integrations, index);
      if (this._objectLength(sliced_integrations) > max_bytes) {
        max = index;
      } else {
        min = index;
      }
    }
    max_integrations = get_sliced_integrations.call(this, integrations, max);

    return this._objectLength(max_integrations) <= max_bytes ? max_integrations : sliced_integrations;
  }

  _inflateIntegrations(integrations) {
    let integrations_data = {},
      versions = integrations.versions || {};

    integrations = integrations || {};

    _.each(integrations, (addons, room) => {
      if (room === "versions") {
        return;
      }

      integrations_data[room] = {};
      _.each(addons, (addon) => {
        var addon_version = versions[addon];
        if (!_.isUndefined(addon_version)) {
          integrations_data[room][addon_version.addon_key] = addon_version;
        }
      });
    });

    return integrations_data;
  }

  /**
   * prepares integrations object
   *
   * @param {Object} integrations
   * @returns {Object} storedIntegrations
   * @private
   */
  _deflate(integrations) {
    let storedIntegrations = {
      versions: {}
    };
    _.each(integrations, (addons, room) => {
      storedIntegrations[room] = [];
      _.each(addons, (addon) => {
        storedIntegrations[room].push(addon.version);
        storedIntegrations.versions[addon.version] = addon;
      });
    });
    return storedIntegrations;
  }
}

module.exports = IntegrationsStorage;



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/integrations_storage.js
 **/