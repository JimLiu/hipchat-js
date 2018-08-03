import Logger from 'helpers/logger';

/**
 * Instead of using window.setTimeout for anything that requires real
 * time-based intervals, use this. It sets an interval that checks
 * on a given frequency to see if the number of ms have passed since
 * you started the timer.
 *
 * @class Timer
 */
export default class Timer {

  /**
   * @constructs
   * @param {function} callback
   * @param {number} delay
   * @param {number} [interval]
   * @param {boolean} repeat
   */
  constructor(callback, delay, interval, repeat = false) {
    this._callback = callback;
    this._delay = delay;
    this._repeat = repeat;
    this.id = null;
    this.resetTime(delay, interval);
    this.started = false;
    this.cleared = false;
  }

  /**
   * Starts the timer. Can optionally override the callback,
   * delay or interval set in the constructor when calling start().
   * @method start
   */
  start() {
    if (this.id) {
      this.clear();
      Logger.info('[Timer]', 'Timer was already running. Clearing timer and restarting.');
    }
    this._startTime = new Date().getTime();
    this.started = true;
    this.cleared = false;
    this.id = setInterval(() => {
      if (this.hasExpired()) {
        this.resolve();
      }
    }, this._frequency);
    return this;
  }

  /**
   * Update the time for the timer
   * @param {number} delay
   * @param {number} [interval=1000]
   */
  resetTime(delay, interval = (this._frequency || 1000)) {
    this._delay = delay;
    this._frequency = interval < delay ? interval : delay;
    return this;
  }

  /**
   * Restarts the timer
   * @method reset
   */
  restart() {
    this.clear().start();
    return this;
  }

  /**
   * Clears the timer
   * @method clear
   */
  clear() {
    clearInterval(this.id);
    this.id = null;
    this.cleared = true;
    this.started = false;
    return this;
  }

  /**
   * Pauses the timer
   * @method pause
   */
  pause() {
    if (!this._paused) {
      clearInterval(this.id);
      this._paused = true;
    }
  }

  /**
   * Resumes the timer
   * @method resume
   */
  resume() {
    if (this._paused) {
      this._paused = false;
      let remaining = Math.max(this._delay - new Date().getTime() + this._startTime, 0);
      this.resetTime(remaining).start();
    }
  }

  /**
   * Clear timer and execute callback
   * @method resolve
   */
  resolve() {
    if (!this._repeat) {
      this.clear();
    }
    this._callback();
  }

  /**
   * Check to see if enough time has passed
   * @method hasExpired
   */
  hasExpired() {
    return (new Date().getTime() - this._startTime) >= this._delay;
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/common/timer.js
 **/