import AbstractPlugin from './abstract_plugin';

/**
 * Strophe Connection Plugin that uses the xmlInput, xmlOutput,
 * rawInput, and rawOutput methods in Strophe.Connection and
 * turns them into hooks that all Connection plugins can hook into.
 *
 * This follows the existing Strophe convention in that you'll now call
 * addXmlInputHandler, passing in a function. If the function returns
 * true, it will be persistent. If not, it will be cleaned up on first
 * iteration.
 *
 * NOTE: This plugin must be installed before any others to ensure
 * no conflicts
 *
 * @class HooksPlugin
 */
export default class ConnectionHooksPlugin extends AbstractPlugin {

  constructor() {
    super();
    this.handlers = {};
    this.added = {};
    this.removed = {};
    this.reset();
  }

  statusChanged(status, condition) {
    switch (status) {
      case Strophe.Status.CONNECTED:
        this.xmppConnected(status, condition);
        break;

      case Strophe.Status.CONNFAIL:
      case Strophe.Status.AUTHFAIL:
      case Strophe.Status.ERROR:
      case Strophe.Status.DISCONNECTED:
        this.xmppDisconnected(status, condition);
        break;
    }
    super.statusChanged(status, condition);
  }

  init(...args) {
    super.init(...args);
    this.Connection.xmlInput = this._createHooksHandler('xmlInput');
    this.Connection.xmlOutput = this._createHooksHandler('xmlOutput');
    this.Connection.rawInput = this._createHooksHandler('rawInput');
    this.Connection.rawOutput = this._createHooksHandler('rawOutput');
    this.xmppConnected = this._createHooksHandler('xmppConnected');
    this.xmppDisconnected = this._createHooksHandler('xmppDisconnected');

    /**
     * Add a handler that will be fired when the xmlInput method is called on the connection
     * (each time a new request body is received). The handler function will be called, and
     * passed in the XML response body. If the handler returns true, it will be persistent, and called
     * for every request until it is removed. If it returns a falsy value, it will only fire once
     *
     * @method addXmlInputHandler
     * @param {Function} handler
     * @returns {Function} handler
     */
    this.addXmlInputHandler = this._createAddHandler('xmlInput');

    /**
     * Add a handler that will be fired when the xmlOutput method is called on the connection
     * (each time a new request body is sent). The handler function will be called, and
     * passed in the XML request body. If the handler returns true, it will be persistent, and called
     * for every request until it is removed. If it returns a falsy value, it will only fire once
     *
     * @method addXmlOutputHandler
     * @param {Function} handler
     * @returns {Function} handler
     */
    this.addXmlOutputHandler = this._createAddHandler('xmlOutput');

    /**
     * Add a handler that will be fired when the rawInput method is called on the connection
     * (each time a new request body is received). The handler function will be called, and
     * passed in the plain text response body. If the handler returns true, it will be persistent,
     * and called for every request until it is removed. If it returns a falsy value, it will only fire once
     *
     * @method addRawInputHandler
     * @param {Function} handler
     * @returns {Function} handler
     */
    this.addRawInputHandler = this._createAddHandler('rawInput');

    /**
     * Add a handler that will be fired when the rawOutput method is called on the connection
     * (each time a new request body is sent). The handler function will be called, and
     * passed in the plain text request body. If the handler returns true, it will be persistent, and called
     * for every request until it is removed. If it returns a falsy value, it will only fire once
     *
     * @method addRawOutputHandler
     * @param {Function} handler
     * @returns {Function} handler
     */
    this.addRawOutputHandler = this._createAddHandler('rawOutput');

    /**
     * Remove an xmlInput handler that was added with the addXmlInputHandler method. Pass it the
     * handler function as was returned by addXmlInputHandler.
     *
     * @method deleteXmlInputHandler
     * @param {Function} handler
     */
    this.deleteXmlInputHandler = this._createDeleteHandler('xmlInput');

    /**
     * Remove an xmlOutput handler that was added with the addXmlOutputHandler method. Pass it the
     * handler function as was returned by addXmlOutputHandler.
     *
     * @method deleteXmlOutputHandler
     * @param {Function} handler
     */
    this.deleteXmlOutputHandler = this._createDeleteHandler('xmlOutput');

    /**
     * Remove an rawInput handler that was added with the addRawInputHandler method. Pass it the
     * handler function as was returned by addRawInputHandler.
     *
     * @method deleteRawInputHandler
     * @param {Function} handler
     */
    this.deleteRawInputHandler = this._createDeleteHandler('rawInput');

    /**
     * Remove an rawOutput handler that was added with the addRawOutputHandler method. Pass it the
     * handler function as was returned by addRawOutputHandler.
     *
     * @method deleteRawOutputHandler
     * @param {Function} handler
     */
    this.deleteRawOutputHandler = this._createDeleteHandler('rawOutput');

    /**
     * Add a handler that will be fired when strophe successfully connects.
     * If the handler returns true, it will be persistent, and called on every reconnection
     * until it is removed. If it returns a falsy value, it will only fire once
     *
     * @method addXmppConnectedHandler
     * @param {Function} handler
     * @returns {Function} handler
     */
    this.addXmppConnectedHandler = this._createAddHandler('xmppConnected');

    /**
     * Remove an xmppConnected handler that was added with the addXmppConnectedHandler method.
     * Pass it the handler function as was returned by addXmppConnectedHandler.
     *
     * @method deleteXmppConnectedHandler
     * @param {Function} handler
     */
    this.deleteXmppConnectedHandler = this._createDeleteHandler('xmppConnected');

    /**
     * Add a handler that will be fired when strophe disconnects for any reason.
     * The handler will be passed the Strophe.Status enum and condition string if provided.
     * If the handler returns true, it will be persistent, and called on every disconnect
     * until it is removed. If it returns a falsy value, it will only fire once
     *
     * @method addXmppDisconnectedHandler
     * @param {Function} handler
     * @returns {Function} handler
     */
    this.addXmppDisconnectedHandler = this._createAddHandler('xmppDisconnected');

    /**
     * Remove an xmppDisconnected handler that was added with the addXmppDisconnectedHandler method.
     * Pass it the handler function as was returned by addXmppDisconnectedHandler.
     *
     * @method deleteXmppDisconnectedHandler
     * @param {Function} handler
     */
    this.deleteXmppDisconnectedHandler = this._createDeleteHandler('xmppDisconnected');
  }

  /**
   * When the connection is lost, remove all the xml/raw input/output handlers
   */
  onDisconnected() {
    this.reset();
  }

  /**
   * Reset the handlers to the default empty state. Called on init and on disconnection.
   * Don't actually clear the connection handlers on disconnection, as they should remain
   * persistent across reconnection events. Only clear out the xml/raw input/output handlers
   */
  reset() {
    this.handlers.xmlInput = [];
    this.handlers.xmlOutput = [];
    this.handlers.rawInput = [];
    this.handlers.rawOutput = [];
    this.handlers.xmppConnected = this.handlers.xmppConnected || [];
    this.handlers.xmppDisconnected = this.handlers.xmppDisconnected || [];
    this.added.xmlInput = [];
    this.added.xmlOutput = [];
    this.added.rawInput = [];
    this.added.rawOutput = [];
    this.added.xmppConnected = this.added.xmppConnected || [];
    this.added.xmppDisconnected = this.added.xmppDisconnected || [];
    this.removed.xmlInput = [];
    this.removed.xmlOutput = [];
    this.removed.rawInput = [];
    this.removed.rawOutput = [];
    this.removed.xmppConnected = this.removed.xmppConnected || [];
    this.removed.xmppDisconnected = this.removed.xmppDisconnected || [];
  }


  /**
   * Add handler factory
   * @param type
   * @returns {Function}
   * @private
   */
  _createAddHandler(type) {
    return (handler) => {
      if (!_.includes(this.added[type], handler) && !_.includes(this.handlers[type], handler)) {
        this.added[type].push(handler);
      }
      return handler;
    };
  }

  /**
   * @param type
   * @returns {Function}
   * @private
   */
  _createDeleteHandler(type) {
    return (handler) => {
      this.removed[type].push(handler);
    };
  }

  /**
   * Hooks factory
   * @param type
   * @returns {Function}
   * @private
   */
  _createHooksHandler(type) {

    if (this.Connection[type] !== Strophe.Connection.prototype[type]) {
      throw new Error(`
        Error installing Strophe Connection Hooks plugin.
        Strophe.Connection.${type} has already been overwritten.
        Please ensure that the ConnectionHooks plugin is installed
        before any other plugin, and that nothing is overwriting the
        ${type} method.
      `);
    }

    return (...args) => {

      // remove handlers
      while (this.removed[type].length > 0) {
        _.pull(this.handlers[type], this.removed[type].pop());
      }

      // add new handlers
      while (this.added[type].length > 0) {
        this.handlers[type].push(this.added[type].pop());
      }

      let handlers = this.handlers[type];
      this.handlers[type] = [];

      // iterate through handlers and execute them. If they return true,
      // keep them. If they return false or throw an exception, remove them
      handlers.forEach((handler) => {
        try {
          if (handler(...args)) {
            this.handlers[type].push(handler);
          }
        } catch (e) {
          Strophe.warn('Removing Strophe handlers due to uncaught exception: ' + e.message);
        }
      });
    };
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/connection_hooks_plugin.js
 **/