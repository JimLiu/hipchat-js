import DALCache from './dal.cache';
import Emoticon from './models/emoticon';
import ConnectionManager from './xmpp/connection_manager';
import * as NS from './xmpp/lib/namespaces';

/**
 * Dictionary object of Emoticon models keyed by their id
 * @typedef {Object.<string, Emoticon>} Emoticons
 */

/**
 * XMPP representation of emoticons, as received by emoticon list IQ and
 * parsed via x2js
 * @typedef {Object} XMPPEmoticon
 * @property {Object} iq
 * @property {Object} iq.query
 * @property {Array<Emoticon>} iq.query.item
 * @property {string} iq.query.xmlns - 'jabber:iq:roster'
 * @property {string} iq.xmlns - 'jabber:client'
 * @property {string} iq.type - 'result'
 */

/**
 * @module DALEmoticon
 */
const DALEmoticon = {

  /**
   * Temporary method to get the roster in the expected structure of a
   * "download the world" roster IQ XMPP request (ughh)
   *
   * @method getEmoticonsAsXMPP
   * @returns {Promise<XMPPEmoticons, DALError>}
   */
  getEmoticonsAsXMPP(cached) {
    let cached_ver = _.get(cached, 'query.ver', '');
    return this.getEmoticons(cached_ver).then(({ ver, path_prefix, emoticons }) => {
      var iq = {
            query: {
              ver,
              path_prefix,
              item: Object.keys(emoticons).map((id) => Emoticon.asX2JS(emoticons[id])),
              xmlns: NS.HC_EMOTICONS
            },
            type: 'result',
            xmlns: NS.JABBER
          };

      DALCache.updateEmoticons(iq);
      return iq;
    })
    .catch(() => {
      return null;
    });
  },

  /**
   * Gets the full emoticon list.
   * @method getEmoticons
   * @returns {Promise<Emoticons, DALError>}
   */
  getEmoticons(ver) {
    return ConnectionManager.Connection.Emoticons.getEmoticons(ver);
  }

};

export default DALEmoticon;



/** WEBPACK FOOTER **
 ** ./src/js/core/dal.emoticon.js
 **/