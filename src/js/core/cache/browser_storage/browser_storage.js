/**
 * @IMPORTANT: DO NOT IMPORT THIS MODULE DIRECTLY!!!
 * IF YOU NEED TO ACCESS STORAGE, DO SO VIA THE DAL.CACHE MODULE.
 * IT SHOULD OWN THE ONLY INSTANCE OF THIS ADAPTER, AND ALL METHODS
 * WRITTEN TO INTERFACE WITH STORAGE SHOULD BE WRITTEN THERE
 */
import * as Keys from './browser_storage_keys';
import DALError from 'core/models/dal-error';

const PREFIX = 'hc.';
const LEGACY_PREFIX = 'hc-';

/*
 * Browser storage locations
 */
const LOCATIONS = Object.freeze({
  LOCAL: 'localStorage',
  SESSION: 'sessionStorage'
});

/*
 * Defines the current/expected storage schema. Used to invalidate
 * the cache when we make changes to the shape of the data we store
 */
const SCHEMA = Object.freeze({
  [Keys.ROSTER]: '3',
  [Keys.ROOMS]: '4',
  [Keys.EMOTICONS]: '1'
});

/*
 * Keys for data migration/cleanup
 */
const OBSOLETE_KEYS = [
  Keys.PER_ROOM_NOTIFICATION_DIALOG_SHOWN,
  `hc._${Keys.USER_ID}`,
  `hc._${Keys.GROUP_ID}`,
  `hc._${Keys.ROOMS}`,
  `hc._${Keys.ROSTER}`,
  `hc._${Keys.EMOTICONS}`
];

const LEGACY_KEYS = [
  Keys.NOTIF_BANNER_DISMISSAL_COUNT,
  Keys.NOTIF_BANNER_DISMISSED_FOREVER,
  Keys.INTEGRATIONS,
  Keys.CLIENT_PREFERENCES,
  Keys.READSTATE
];

/*
 * Cross-browser check for localStorage quota exceeded error
 * http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors
 */
function isQuotaExceededError(error) {
  switch (error.code) {
    case 22: // Most browsers
      return true;

    case 1014: // Firefox :-(
      return error.name === 'NS_ERROR_DOM_QUOTA_REACHED';

    default:
      return false;
  }
}

/**
 * @class BrowserStorage
 */
class BrowserStorage {

  /**
   * Instantiates the class. Checks user/group against provided params and
   * throws away all stored data if they do not match. Clears out legacy
   * localStorage data that we don't use anymore and migrates data stored
   * in the prior localStorage adapter.
   *
   * @constructs
   * @param {number} user_id
   * @param {number} group_id
   */
  constructor(user_id, group_id) {

    // If the user/group doesn't match what was provided, throw everything away
    if (this._shouldClearPriorUserData(user_id, group_id)) {
      this.clear();

    // Otherwise, migrate over data from legacy storage implementations
    } else {
      this._clearObsoleteData();
      this._migrateLegacyKeys();
    }

    this.set(Keys.SCHEMA, SCHEMA);
    this.set(Keys.USER_ID, user_id);
    this.set(Keys.GROUP_ID, group_id);
  }

  /**
   * @method has
   * @param {string} key
   * @param {object} [options = { location: 'localStorage' }]
   * @returns {boolean}
   */
  has(key, options = { location: LOCATIONS.LOCAL }) {
    return ((PREFIX + key) in this._getAPI(options.location));
  }

  /**
   * @method get
   * @param {string} key
   * @param {object} [options = { location: 'localStorage' }]
   * @returns {*}
   */
  get(key, options = { location: LOCATIONS.LOCAL }) {
    let api = this._getAPI(options.location);
    if (this.has(key, options)) {
      return this._deserialize(api.getItem(PREFIX + key));
    }
    return null;
  }

  /**
   * @method set
   * @param {string} key
   * @param {*} value
   * @param {object} [options = { location: 'localStorage' }]
   */
  set(key, value, options = { location: LOCATIONS.LOCAL }) {
    let api = this._getAPI(options.location),
      data = this._serialize(value);
    try {
      api.setItem((PREFIX + key), data);
    } catch (e) {
      this.unset(key, options); // erase partial writes
      let error = isQuotaExceededError(e) ?
        DALError.ofType(DALError.Types.STORAGE_DOM_QUOTA_EXCEEDED, e) :
        DALError.ofType(DALError.Types.EXCEPTION, e);
      if (window.Raven) {
        window.Raven.captureException(error);
      }
      throw error;
    }
    return true;
  }

  /**
   * @method unset
   * @param {string} key
   * @param {object} [options = { location: 'localStorage' }]
   * @returns {boolean}
   */
  unset(key, options = { location: LOCATIONS.LOCAL }) {
    let api = this._getAPI(options.location);
    api.removeItem(PREFIX + key);
    return true;
  }

  /**
   * For both localStorage and sessionStorage, find all keys that contain either
   * the new or legacy prefixes and remove the items completely
   *
   * @method clear
   */
  clear() {
    let prefixMatch = new RegExp(`^${PREFIX}|^${LEGACY_PREFIX}`);
    _.forOwn(LOCATIONS, (location) => {
      let api = this._getAPI(location);
      Object.keys(api)
        .filter(key => prefixMatch.test(key))
        .forEach(key => api.removeItem(key));
    });
    return true;
  }

  /**
   * Check provided user and group id against previously stored values (if they exist)
   * Returns true if the prior values exist and they don't match the provided values
   * @private
   */
  _shouldClearPriorUserData(user_id, group_id) {
    if (this.has(Keys.USER_ID) && this.has(Keys.GROUP_ID)) {
      let prevUser = this.get(Keys.USER_ID),
        prevGroup = this.get(Keys.GROUP_ID);
      return !(prevUser === user_id && prevGroup === group_id);
    }
    return false;
  }

  /**
   * Directly accessing window.localStorage will throw if the user has
   * disabled it in the browser (ohcrap)
   * @private
   */
  _getAPI(location) {
    try {
      switch (location) {
        case LOCATIONS.SESSION:
          return window.sessionStorage;
        case LOCATIONS.LOCAL:
        default:
          return window.localStorage;
      }
    } catch (e) {
      let error = DALError.ofType(DALError.Types.STORAGE_INACCESSIBLE, e);
      if (window.Raven) {
        window.Raven.captureException(error);
      }
      throw error;
    }
  }

  /**
   * @private
   */
  _serialize(value) {
    return JSON.stringify(value, function(k, v) {
      if (v instanceof RegExp) {
        return v.toString();
      }
      return v;
    });
  }

  /**
   * @private
   */
  _deserialize(value) {
    if (_.includes(['null', 'undefined', ''], value)) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (e) {
      let error = DALError.ofType(DALError.Types.STORAGE_JSON_SERIALIZATION, e);
      if (window.Raven) {
        window.Raven.captureException(error);
      }
      return null;
    }
  }

  /**
   * Clean out obsolete data
   * @private
   */
  _clearObsoleteData() {
    let oldSchema = this.get(Keys.SCHEMA),
      api = this._getAPI();

    // check expected schema against last stored schema
    // and delete any data under keys where they don't match
    Object.keys(SCHEMA).forEach((key) => {
      if (!oldSchema || oldSchema[key] !== SCHEMA[key]) {
        this.unset(key);
      }
    });

    // delete data stored under old/unused keys
    // these are not prefixed
    OBSOLETE_KEYS.forEach(function (key) {
      api.removeItem(key);
    });
  }

  /**
   * Migrate data stored under old "hc-" prefixed keys to
   * use the new "hc." prefix for consistency
   * @private
   */
  _migrateLegacyKeys() {
    let api = this._getAPI();
    LEGACY_KEYS.forEach(function (key) {
      let legacyKey = LEGACY_PREFIX + key,
        newKey = PREFIX + key;
      if (legacyKey in api) {
        let data = api.getItem(legacyKey);
        api.removeItem(legacyKey);
        api.setItem(newKey, data);
      }
    });
  }

}

/*
 * Expose constants above as static properties on the class
 * Hide the schema in a symbol since that should never be directly
 * accessed, other than in testing
 */
BrowserStorage[Symbol.for('HJC.Storage.Schema')] = SCHEMA;
BrowserStorage.Locations = LOCATIONS;

export default BrowserStorage;



/** WEBPACK FOOTER **
 ** ./src/js/core/cache/browser_storage/browser_storage.js
 **/