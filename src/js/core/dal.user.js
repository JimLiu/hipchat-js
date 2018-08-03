import DALSync from './dal.sync';
import User from './models/user';
import * as NS from './xmpp/lib/namespaces';

/**
 * Dictionary object of User models keyed by their id
 * @typedef {Object.<string, User>} Roster
 */

/**
 * XMPP representation of roster, as received by roster IQ and
 * parsed via x2js
 * @typedef {Object} XMPPRoster
 * @property {Object} iq
 * @property {Object} iq.query
 * @property {Array<User>} iq.query.item
 * @property {string} iq.query.xmlns - 'jabber:iq:roster'
 * @property {string} iq.xmlns - 'jabber:client'
 * @property {string} iq.type - 'result'
 */

/**
 * @module DALUser
 */
const DALUser = {

  /**
   * Temporary method to get the roster in the expected structure of a
   * "download the world" roster IQ XMPP request (ughh)
   *
   * @method getRosterAsXMPP
   * @returns {Promise<XMPPRoster, DALError>}
   */
  getRosterAsXMPP() {
    return this.getRoster().then((roster) => {
      return {
        iq: {
          query: {
            item: Object.keys(roster).map((id) => User.asX2JS(roster[id])),
            xmlns: NS.ROSTER
          },
          type: 'result',
          xmlns: NS.JABBER
        }
      };
    });
  },

  /**
   * Gets the entire roster by either syncing or downloading the list
   * from the server.
   *
   * @method getRoster
   * @returns {Promise<Roster, DALError>}
   */
  getRoster() {
    return DALSync.getRoster();
  }

};

export default DALUser;


/** WEBPACK FOOTER **
 ** ./src/js/core/dal.user.js
 **/