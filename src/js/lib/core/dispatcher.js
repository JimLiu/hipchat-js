var EventEmitter = require("events").EventEmitter;
class Dispatcher extends EventEmitter {

  constructor() {
    super();
    this.setMaxListeners(20);
  }

  dispatch(action, ...args) {
    this.emit.apply(this, ["before:" + action].concat(args));
    this.emit.apply(this, arguments);
    this.emit.apply(this, ["after:" + action].concat(args));
  }

  registerOnce(action, callback) {
    if (_.isArray(action)) {
      let promises = action.map(evt => {
        return new Promise(resolve => {
          this.once(evt, (...args) => {
            resolve({
              action: evt,
              data: args
            });
          });
        });
      });

      return Promise.all(promises).then((returns) =>{
        var data = {};

        _.forEach(returns, (val) => {
          data[val.action] = val.data;
        });

        callback(data);
      });

    } else if (_.isString(action)) {
      this.once(action, callback);

    } else if (_.isObject(action)) {
      _.forOwn(action, (val, key) => {
        this.once(key, val);
      });
    }
  }

  register(action, callback) {
    if (_.isString(action)) {
      this.on(action, callback);
    } else if (_.isObject(action)) {
      _.forOwn(action, (val, key) => {
        this.on(key, val);
      });
    }
  }

  unregister(action, callback) {
    if (_.isString(action)) {
      this.removeListener(action, callback);
    } else if (_.isObject(action)) {
      _.forOwn(action, (val, key) => {
        this.removeListener(key, val);
      });
    }
  }
}

module.exports = Dispatcher;



/** WEBPACK FOOTER **
 ** ./src/js/lib/core/dispatcher.js
 **/