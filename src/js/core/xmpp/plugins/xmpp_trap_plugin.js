import AbstractPlugin from './abstract_plugin';
import IQProcessor from 'core/common/iq_processor';
import BoshActions from 'actions/bosh_actions';
import x2js from 'core/common/x2js';
import Logger from 'helpers/logger';
import * as NS from '../lib/namespaces';

/**
 * This is the "global xmpp trap" that propagates the majority of the
 * XMPP data to our application -- and is a total and terrible hack.
 *
 * The xmlInput and rawInput methods are noops within Strophe that can be overridden
 * to provide custom xml processing before moving them along to Strophe's handlers.
 * Here, we're building a JSON blob out of the 2 methods since they're called
 * one after the other, and bypassing Strophe from there -- passing the converted
 * JSON up to our app via the receivedServerData action (shrug)
 *
 * @class XMPPTrapPlugin
 */
export default class XMPPTrapPlugin extends AbstractPlugin {

  constructor() {
    super();
    this.queue = null;
  }

  /**
   * Create a single instance of the handler callbacks that are bound to 'this'
   * just after the plugin is instantiated. These will be the callback instances
   * registered to the xmlInput and rawInput hooks each time
   * @param args
   */
  init(...args) {
    super.init(...args);
    this.xmlInputHandler = this.onXmlInput.bind(this);
    this.xmlOutputHandler = this.onXmlOutput.bind(this);
    this.rawInputHandler = this.onRawInput.bind(this);
  }

  /**
   * On connected, attach the global trap handlers.
   * @override
   */
  onConnected() {
    this.Connection.last_BOSH_activity = new Date().getTime();
    this.Connection.ConnectionHooks.addXmlInputHandler(this.xmlInputHandler);
    this.Connection.ConnectionHooks.addRawInputHandler(this.rawInputHandler);
    this.Connection.ConnectionHooks.addXmlOutputHandler(this.xmlOutputHandler);
  }

  /**
   * Called by Strophe on each ajax response with the parsed XML data
   * @param elem
   * @returns {boolean} true - always return true
   */
  onXmlInput(elem) {
    try {
      Logger.logXML(elem, 'RECV');
      let xmpp = this._removeExcludedNodes(elem);
      this.queue = {
        xml: xmpp,
        json: x2js.xml2json(xmpp)
      };
      let is_iq_stanza = !!_.get(this.queue.json, 'iq', false);
      if (is_iq_stanza) {
        this.queue.json = IQProcessor.transform(this.queue.json);
      }
    } catch (e) {
      Logger.type('xmpp-trap').error(`Exception thrown in xmlInput handler: ${e.message}.`);
    }
    return true;
  }

  /**
   * Called by Strophe on each ajax response with the raw body text
   * @param raw
   * @returns {boolean} true - always return true
   */
  onRawInput(raw) {
    try {
      this.Connection.last_BOSH_activity = new Date().getTime();
      if (this.queue.xml && this.queue.xml.hasChildNodes()) {
        if (this.queue.json.message) {
          this.queue.json.message = this._fixXhtmlMessageBody(raw, this.queue.json.message);
        }
        BoshActions.receivedServerData(this.queue.json);
      }
      this.queue = null;
    } catch (e) {
      Logger.type('xmpp-trap').error(`Exception thrown in rawInput handler: ${e.message}.`);
    }
    return true;
  }

  /**
   * Called by Strophe just *after* sending each ajax request.
   * Useful for logging
   * @param elem
   * @returns {boolean} true - always return true
   */
  onXmlOutput(elem) {
    Logger.logXML(elem, 'SEND');
    return true;
  }

  /**
   * As we begin to properly manage xmpp in the DAL, we should start removing from incoming
   * XML before passing it to the app to prevent data propagating multiple times. This
   * is done on a clone of the xml passed in, as we don't want to remove the nodes from
   * the original as the nodes won't make it to our plugin handlers.
   * @param {xml} xmpp raw xml input from the ajax request
   * @returns {xml} clone of the original xml with appropriate nodes removed
   */
  _removeExcludedNodes(xmpp) {
    let exclusions = [],
      elem = xmpp.cloneNode(true);

    let iqIgnoreList = [
      NS.ROSTER,
      NS.DISCO_ITEMS,
      NS.DISCO_INFO,
      NS.HC_LINKS,
      NS.HC_FILES,
      NS.HC_AUTHENTICATED_FILE
    ];

    Array.from(elem.querySelectorAll('iq')).forEach(function (iq) {
      if (_.includes(['result', 'error'], iq.getAttribute('type'))) {
        let query = iq.querySelector('query');
        if (query && _.includes(iqIgnoreList, query.getAttribute('xmlns'))) {
          exclusions.push(iq);
        }
      }
    });

    exclusions.forEach(function (node) {
      elem.removeChild(node);
    });

    return elem;
  }

  /**
   * Regexes out the xhtml body of an xhtml message from the raw ajax response.
   * (noidea) why or what purpose this serves, but this has existed since the
   * first commit of HJC (shrug)
   */
  _fixXhtmlMessageBody(raw, messages) {
    return _.map([].concat(messages), (message) => {
      if (_.get(message, 'html.body.xmlns') === 'http://www.w3.org/1999/xhtml') {
        let messageExtractor = new RegExp("mid=['\"]" + message.mid + "['\"]\.+?</message>", "i"),
          xhtmlBodyExtractor = new RegExp("<body[^>]*xmlns=[\"']http:\\/\\/www\\.w3\\.org\\/1999\\/xhtml[\"'][^>]*>(.*?)<\/body>", "i"),
          matches = messageExtractor.exec(raw) || [];
        if (matches.length) {
          matches = xhtmlBodyExtractor.exec(matches[0]) || [];
          if (matches.length > 1) {
            message.html.body.__text = matches[1];
          }
        }
      }
      return message;
    });
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/xmpp_trap_plugin.js
 **/