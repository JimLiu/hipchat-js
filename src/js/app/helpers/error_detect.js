/**
 * Attempt to detect unrecoverable errors
 *
 * @module ErrorDetect
 */
const ERRORS = {};

export default class {
  constructor (callback) {
    this.callback = callback || function () {};
  }

  _normalizeError (e) {
    var err = {};
    if (e instanceof Error) {
      err = e;
    } else if (typeof ErrorEvent !== "undefined" && e instanceof ErrorEvent) {
      err = e.error || e;
    }
    return err;
  }

  trigger (err) {
    _.each(ERRORS, (def, type) => {
      var detected = false;
      try {
        detected = def.detect(err);
      } catch (ignore) {
        // we want to ensure we don't trigger window.onerror to avoid recursing
      }

      if (detected) {
        var currentTime = Date.now();
        if (currentTime <= def._last + def.time) {
          def._count++;
        } else {
          def._count = 1;
        }
        if (def._count > def.threshold) {
          def._count = 0;
          this.callback.call(this, type, err);
        }
        def._last = currentTime;
      }
    });
  }

  /**
   * Install the ErrorDetect module, adding an error event handler to the console
   *
   * @method install
   */
  install () {
    window.addEventListener("error", (e) => {
      var err = this._normalizeError(e);
      this.trigger(err);
    });
  }

  /**
   *
   * @param {string} type the identifier for this rule
   * @param {object} options the options hash
   * @param {function} options.detect the function to determine if this rule is hit
   * @param {number} options.threshold the threshold of error occurrences
   * @param {number} options.time the sliding window time in milliseconds in which to count these errors
   */
  addRule (type, options) {
    ERRORS[type] = options;
  }
}


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/error_detect.js
 **/