/* global Strophe */
import spi from 'spi';
import utils from 'helpers/utils';
import PreferencesStore from 'stores/preferences_store';
import ConfigStore from 'stores/configuration_store';
import LogSanitizer from 'helpers/logger_sanitizer';
import * as Constants from 'core/common/constants';

const STROPHE = '[Strophe]';
const DEFAULT_REGEXP_STRING = '/^.*?$/';
const OLD_LOGGER_TYPE = 'old-logger';

/*
 * NOTE: Do not use DAL.Cache for browser storage in the logger. We need the logger to be
 * able to log from earliest init. Can't hold logging until after DAL.Cache is configured
 */
class Logger {

  constructor() {

    window.HC_LOG = window.HC_LOG || this.storage.getItem('logging');
    window.HC_LOG_VERBOSE = window.HC_LOG_VERBOSE || !!this.storage.getItem('verbose-logging');
    window.HC_LOG_CALL_STACK = window.HC_LOG_CALL_STACK || !!this.storage.getItem('logging-call-stack');
    window.HC_LOG_FORCE_COLORS = window.HC_LOG_FORCE_COLORS || !!this.storage.getItem('logging-force-colors');
    window.HC_LOG_FORCE_EXPANDED = window.HC_LOG_FORCE_EXPANDED || !!this.storage.getItem('logging-force-expanded');

    this.verbose_mode_enabled = window.HC_LOG_VERBOSE;

    // Implement logging for Strophe when in verbose mode
    Strophe.log = (level, message) => {
      if (this.isVerbose() || this.isNewLogger()) {
        switch(level) {

          case Strophe.LogLevel.INFO:
            this.info(STROPHE, message);
            this.type('strophe').withFilter().info(message);
            break;

          case Strophe.LogLevel.WARN:
            this.warn(STROPHE, message);
            this.type('strophe').withFilter().warn(message);
            break;

          case Strophe.LogLevel.ERROR:
          case Strophe.LogLevel.FATAL:
            this.error(STROPHE, message);
            this.type('strophe').withFilter().error(message);
            break;

          default:
            this.debug(STROPHE, message);
            this.type('strophe').withFilter().debug(message);
        }
      }
    };

    this.verbose_mode_reminder_logged = false;

    this.colors = [
      'maroon',
      'olive',
      'green',
      'purple',
      'teal',
      'navy'
    ];

    this.levels = [
      'error',
      'warn',
      'info',
      'debug',
      'log'
    ];

    this.resetLogger();
  }

  error(...args) {
    args.unshift('error');
    return this.doLog(...args);
  }

  warn(...args) {
    args.unshift('warn');
    return this.doLog(...args);
  }

  info(...args) {
    args.unshift('info');
    return this.doLog(...args);
  }

  debug(...args) {
    args.unshift('debug');
    return this.doLog(...args);
  }

  log(...args) {
    args.unshift('log');
    return this.doLog(...args);
  }

  logXML(elem, type) {
    try {
      if (!this.shouldLogXML()) {
        return;
      }

      // <body> is always the base element, but we don't want it polluting all the logs
      // Iterate through the child nodes and log them individually (usually there should be only one)
      for (var i = 0; i < elem.childNodes.length; i++) {
        let xml = this.sanitizeXML(elem.childNodes[i]);
        let xmlString = utils.xml.toString(xml);
        let logString = `[XML ${type}] ${xmlString}`;

        if (logString.length > Constants.XMPP_LOG_MAX_CHARS) {
          let truncatedChars = logString.length - Constants.XMPP_LOG_MAX_CHARS;
          let truncatedString = logString.substring(0, Math.min(Constants.XMPP_LOG_MAX_CHARS, logString.length));
          this.debug(`${truncatedString}... [truncated ${truncatedChars} chars]`);
        } else {
          this.debug(logString);
        }
      }
    } catch (e) {
      if ('console' in window) {
        console.error(e.message);
      }
      spi.onLogMessage('[ERROR] ' + e.message);
    }
  }

  type(type){
    this._log_type = type;
    return this;
  }

  desc(description){
    this._log_description = description;
    return this;
  }

  withCallStack(){
    this._log_call_stack = true;
    return this;
  }

  alwaysExpanded(){
    this._log_always_expanded = true;
    return this;
  }

  withFilter(){
    this._log_with_filter = true;
    return this;
  }

  isNewLogger(){
    return window.HC_LOG && Number(window.HC_LOG) !== 1 && `${window.HC_LOG}`.length;
  }

  doLog(...args) {

    let currentTime = +new Date;
    let diff = currentTime - (this.prevTime || currentTime);
    this.prevTime = currentTime;

    this.updateVerboseMode(window.HC_LOG_VERBOSE);

    try {
      var level = args.shift(),
          verboseArgs = _.map(_.filter(args, 'verbose'), 'verbose');

      if (verboseArgs.length > 0) {
        // if verbose objects found strip them out of the args list
        args = _.reject(args, 'verbose');
        if (this.isVerbose()) {
          // restore objects without {verbose: object} container
          verboseArgs.forEach((val) => {
            args.push(val);
          });
        } else {
          // leave a message that the verbose object was removed
          args.push("[verbose]");
          if (!this.verbose_mode_reminder_logged) {
            // leave friendly to inform user that verbose mode is off
            this.verbose_mode_reminder_logged = true;
            this.info('Enable Verbose Mode for complete logs - window.HC_LOG_VERBOSE');
          }
        }
      }

      if (!window.HC_LOG) {
        this.storage.removeItem('logging');
      }

      if (!window.HC_LOG_CALL_STACK){
        this.storage.removeItem('logging-call-stack');
      }

      if (!window.HC_LOG_FORCE_COLORS){
        this.storage.removeItem('logging-force-colors');
      }

      if (!window.HC_LOG_FORCE_EXPANDED){
        this.storage.removeItem('logging-force-expanded');
      }

      if ('console' in window && window.HC_LOG) {

        let matchFilter;

        this.storage.setItem('logging', window.HC_LOG);

        if (window.HC_LOG_CALL_STACK) {
          this.storage.setItem('logging-call-stack', true);
        }

        if (window.HC_LOG_FORCE_COLORS) {
          this.storage.setItem('logging-force-colors', true);
        }

        if (window.HC_LOG_FORCE_EXPANDED){
          this.storage.setItem('logging-force-expanded', true);
        }

        // Todo: remove me when all logs will use new logger system.
        if (!this._log_type) {
          this._log_type = OLD_LOGGER_TYPE;
          this._log_description = `Migrate me to new logger system or skip with HC_LOG="*,-*${OLD_LOGGER_TYPE}"`;
          this._log_call_stack = true;
        }

        if (this.isNewLogger() && this._log_type){

            // add additional prefix for important level types
            if (!(level === 'log' || level === 'debug')){
              this._log_type = `${level}:${this._log_type}`;
            }

            if (this._log_types !== window.HC_LOG) {
              this._log_types = window.HC_LOG;
              let newFilters = `${window.HC_LOG}`.split(',').map((filter) => filter.trim());
              let toRegExp = (filter) => new RegExp(`^${filter.replace(/\*/g, '.*?')}$`);
              this._ignoreFilters = newFilters.filter((filter) => filter.indexOf('-') === 0)
                                              .map((filter) => filter.slice(1))
                                              .map(toRegExp);
              this._filters = newFilters.filter((filter) => filter.indexOf('-') !== 0)
                                        .map(toRegExp);
            }

            let ignored = false;

            this._ignoreFilters.forEach((filter) => {
              if (this._log_type.search(filter) !== -1) {
                ignored = true;
              }
            });

            if (!ignored){
              this._filters.forEach((filter) => {
                if (!this._log_with_filter ||
                     this._log_with_filter && filter.toString() !== DEFAULT_REGEXP_STRING ||
                     // Todo: remove me when all logs will use new logger system.
                     this._log_type === OLD_LOGGER_TYPE){
                  if (this._log_type.search(filter) !== -1) {
                    matchFilter = true;
                  }
                }
              });
            }
        }

        if (matchFilter && this._log_type) {

          args = args.map((arg) => {
            if (_.isFunction(arg)) {
              return "[function call]";
            } else if (_.isPlainObject(arg) || _.isArray(arg)){
              try {
                return JSON.parse(JSON.stringify(arg));
              } catch (e){
                 console.error(e);
              }
            }
            return arg;
          });

          this.evenLog = !this.evenLog;
          this.colorIndex = this.colorIndex || 0;

          let groupArgs = [];

          if (utils.browser.is.chrome() || window.HC_LOG_FORCE_COLORS) {
            groupArgs.push(
              `%c${this._log_type} %c+${diff}ms %c${this._log_description}`,
              `color: ${(this.evenLog) ? 'gray' : 'dimgray'}`,
              `color: ${this.colors[this.colorIndex]}`,
              `color: blue`
            );
          } else {
            groupArgs.push(
              `${this._log_type} +${diff}ms ${this._log_description}`
            );
          }

          if (this.colorIndex >= this.colors.length - 1){
            this.colorIndex = 0;
          } else {
            this.colorIndex++;
          }

          let isSingleObjectArg = args.length === 1 &&
                                  _.isObject(args[0]) &&
                                  !_.isEmpty(args[0]) &&
                                  _.values(args[0]).every((value) => !_.isObject(value));

          let nonObjectArgs = args.every((value) => !_.isObject(value));

          // Todo: remove first line when all logs will use new logger system.
          let isCollapsed = this._log_type !== OLD_LOGGER_TYPE &&
                             (!window.HC_LOG_FORCE_EXPANDED &&
                             !this._log_always_expanded &&
                             !isSingleObjectArg &&
                             !nonObjectArgs &&
                             (args.some(_.isObject) || args.every(_.isEmpty))) &&
                             (level === 'log' || level === 'debug');

          let group = isCollapsed ? console.groupCollapsed : console.group;

          group.apply(console, groupArgs);
          console[level].apply(console, args);
          if (window.HC_LOG_CALL_STACK || this._log_call_stack){
            if (console.trace){
              console.trace();
            } else {
              console.log((new Error).stack);
            }
          }
          console.groupEnd();

        // Todo: remove part of expression when all logs will use new logger system.
        } else if ( Number(window.HC_LOG) === 1 && (!this._log_type || this._log_type === OLD_LOGGER_TYPE) ) {
          console[level].apply(console, args);
        }
      }

      if (this.shouldLogToFile() && (!this._log_type || this._log_type === OLD_LOGGER_TYPE)) {
        var message = this.formatLogMessage(level, args);
        spi.onLogMessage(message);
      }
    } catch (e) {
      if ('console' in window) {
        console.error(e.message);
      }
      spi.onLogMessage('[ERROR] ' + e.message);
    }

    this.resetLogger();
  }

  resetLogger(){
    this._log_type = null;
    this._log_description = "";
    this._log_call_stack = false;
    this._log_with_filter = false;
    this._log_always_expanded = false;
  }

  formatLogMessage(level, args) {
    var curlevel = `[${level.toUpperCase()}]`,
        formattedArgs = [];

    try {
      args.forEach((el) => {
        el = this.sanitize(el);
        if (_.isObject(el)) {
          el = JSON.stringify(el);
        }
        formattedArgs.push(el);
      });
    } catch (e) {
      return "Value cannot be logged.";
    }
    return `${curlevel} ${formattedArgs.join(" ")}`;
  }

  updateVerboseMode(bool) {
    bool = !!bool;
    if (bool) {
      this.storage.setItem('verbose-logging', true);
    } else {
      this.storage.removeItem('verbose-logging');
    }
    if (this.isVerbose() !== bool){
      this.verbose_mode_enabled = bool;
    }
  }

  isVerbose() {
    return this.verbose_mode_enabled;
  }

  shouldLogXML() {
    return this.shouldLogToFile() || this.isVerbose();
  }

  shouldLogToFile() {
    return PreferencesStore.shouldLog() || ConfigStore.shouldLogToFile();
  }

  sanitize(val) {
    return LogSanitizer.sanitize(val);
  }

  sanitizeXML(el) {
    return LogSanitizer.sanitizeXML(el);
  }

  get storage(){
    if (!this.isNativeClient()){
      return window.sessionStorage;
    }
    return window.localStorage;
  }

  isNativeClient(){
    return utils.clientSubType.isNative(ConfigStore.get("client_subtype"));
  }

}

module.exports = new Logger();



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/logger.js
 **/