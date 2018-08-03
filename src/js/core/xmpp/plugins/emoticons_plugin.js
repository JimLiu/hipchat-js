import AbstractPlugin from './abstract_plugin';
import Emoticon from 'core/models/emoticon';
import DALError from 'core/models/dal-error';
import * as NS from '../lib/namespaces';

export default class EmoticonsPlugin extends AbstractPlugin {

  init(...args) {
    super.init(...args);
    Strophe.addNamespace('HC_EMOTICONS', NS.HC_EMOTICONS);
  }

  /**
   * Get the full emoticon list from XMPP
   *
   * @method getEmoticons
   * @returns {Promise<Array<Emoticon>, DALError>}
   */
  getEmoticons(cached_ver = '') {
    let stanza = $iq({ type: 'get' })
      .c('query', { xmlns: Strophe.NS.HC_EMOTICONS, ver: cached_ver });

    return new Promise((resolve, reject) => {
      let success = (xmpp) => {
        let query = xmpp.getElementsByTagNameNS(Strophe.NS.HC_EMOTICONS, 'query')[0];
        let ver = query.getAttribute('ver') || '';
        let path_prefix = query.querySelector('path_prefix').textContent || '';
        let items = Array.from(query.querySelectorAll('item'));
        let emoticons = items.map((item) => Emoticon.fromXMPP(item));

        resolve({ ver, path_prefix, emoticons });
      };

      let error = (xmpp) => {
        reject(DALError.fromXMPP(xmpp));
      };

      this.Connection.sendIQ(stanza.tree(), success, error);
    });
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/emoticons_plugin.js
 **/