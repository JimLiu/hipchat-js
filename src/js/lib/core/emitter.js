var Utils = require('helpers/utils'),
    EventEmitter = require('events').EventEmitter;

class Emitter extends EventEmitter {
  on(type, callback) {
    Utils.toArray(type).forEach(t => super.on.call(this, t, callback));
  }

  once(type, callback) {
    Utils.toArray(type).forEach(t => super.once.call(this, t, callback));
  }

  off(type, callback) {
    Utils.toArray(type).forEach(t => super.removeListener.call(this, t, callback));
  }
}

module.exports = Emitter;


/** WEBPACK FOOTER **
 ** ./src/js/lib/core/emitter.js
 **/