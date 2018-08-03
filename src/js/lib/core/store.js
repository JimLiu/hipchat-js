import Emitter from "./emitter";

class Store extends Emitter {

  constructor() {

    super();

    this.data = this.getDefaults();

    this.registerListeners();

    this._logger_name = _.kebabCase(this.constructor.name);
  }

  has(key) {
    return this.data.hasOwnProperty(key);
  }

  get(key) {
    return this.data[key];
  }

  getAll() {
    return this.data;
  }

  setIfNotEqual(key, value) {
    var data = key;

    if (value !== undefined) {
      data = {};
      data[key] = value;
    }

    this.doSet(data, true);
  }

  set(key, value) {
    var data = key;

    if (value !== undefined) {
      data = {};
      data[key] = value;
    }

    this.doSet(data, false);
  }

  doSet(data, doEqualityCheck) {
    var changeset = {};
    var hasChange = false;

    _.keys(data).forEach((key) => {

      var shouldSet = !doEqualityCheck || (doEqualityCheck && !_.isEqual(data[key], this.data[key]));

      if (shouldSet) {
        hasChange = true;
        var oldValue = this.get(key),
            value = data[key];

        this.data[key] = value;
        changeset[key] = value;
        this.emit("change:" + key, value, oldValue);

        let Logger = require("helpers/logger");
        Logger.type(`${this._logger_name}:data:${key}`)
              .withFilter()
              .withCallStack()
              .log({
                new_value: value,
                old_value: oldValue
              });
      }

    });

    if (!doEqualityCheck || (doEqualityCheck && hasChange)) {
      this.emit("change", changeset);
    }
  }

  unset(key) {
    if (this.has(key)) {
      var oldValue = this.get(key);
      delete this.data[key];

      this.emit("change:" + key, undefined, oldValue);
    }
  }

  clear() {
    var changeset = {};

    _.keys(this.data).forEach((key) => {
      changeset[key] = this.get(key);
      this.unset(key);
    });

    this.emit("change", changeset);
  }

  /**
   * Registers listeners.
   */
  registerListeners() {}

  /**
   * Returns the default value of the store
   */
  getDefaults() {
    return {};
  }

  reset(){
    this.data = this.getDefaults();
  }
}

module.exports = Store;


/** WEBPACK FOOTER **
 ** ./src/js/lib/core/store.js
 **/