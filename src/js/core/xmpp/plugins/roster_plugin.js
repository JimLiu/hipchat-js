import AbstractPlugin from './abstract_plugin';
import User from 'core/models/user';
import DALError from 'core/models/dal-error';

export default class RosterPlugin extends AbstractPlugin {

  init(...args) {
    super.init(...args);
  }

  /**
   * Get the full roster from XMPP
   *
   * @method getRoster
   * @returns {Promise<Array<User>, DALError>}
   */
  getRoster() {
    let stanza = $iq({ type: 'get' })
      .c('query', { xmlns: Strophe.NS.ROSTER });

    return new Promise((resolve, reject) => {
      let success = (xmpp) => {
        let query = xmpp.getElementsByTagNameNS(Strophe.NS.ROSTER, 'query')[0],
          items = Array.from(query.querySelectorAll('item')),
          users = items.map((item) => User.fromXMPP(item));
        resolve(users);
      };

      let error = (xmpp) => reject(DALError.fromXMPP(xmpp));

      this.Connection.sendIQ(stanza.tree(), success, error);
    });
  }

}


/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/roster_plugin.js
 **/