import Store from 'lib/core/store';

class ExampleStoreModel {
  constructor(input = Object.create(null)) {
    Object.assign(this, input);
  }
}

export default class ModelStore extends Store {

  constructor() {
    super();
    this.data = this._convertToModel(this.data);
  }

  /**
   * Override this method to return the model the extending store should use
   * @returns {Model}
   */
  getModel() {
    return ExampleStoreModel;
  }

  /**
   * @override
   * @param key
   * @param value
   */
  setIfNotEqual(key, value) {
    this.set(key, value, true);
  }

  /**
   * @override
   * @param key
   * @param value
   * @param doEqualityCheck
   */
  set(key, value, doEqualityCheck = false) {
    let data = this._getInputObject(key, value);
    if (data && !_.isEmpty(data)) {
      this.doSet(this._convertToModel(data), doEqualityCheck);
    }
  }

  /**
   * @private
   */
  _getInputObject(key, value) {
    if (_.isObject(key)) {
      return key;
    } else if (_.isString(key) && !_.isUndefined(value)) {
      return { [key]: value };
    }
    return null;
  }

  /**
   * @param data
   * @returns {Model}
   */
  _convertToModel(data) {
    let Model = this.getModel();
    return new Model(data);
  }

  /**
   * @override
   */
  reset() {
    this.data = this._convertToModel(this.getDefaults());
  }

}


/** WEBPACK FOOTER **
 ** ./src/js/lib/core/model_store.js
 **/