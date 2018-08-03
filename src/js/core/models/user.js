import utils from 'helpers/utils';

/**
 * @class User
 * @property {number|null} id
 * @property {string|null} jid
 * @property {string} name
 * @property {string} mention_name
 * @property {string} email
 * @property {string} title
 * @property {string} photo_url
 * @property {string} version
 * @property {boolean} is_guest
 * @property {boolean} is_deleted
 */
export default class User {

  /**
   * @constructs
   * @param {object} input
   * @param {number} [input.id = null]
   * @param {string} [input.jid = null]
   * @param {string} [input.name = '']
   * @param {string} [input.mention_name = '']
   * @param {string} [input.email = '']
   * @param {string|null} [input.title = null]
   * @param {string} [input.photo_url = '']
   * @param {string} [input.version = '']
   * @param {boolean} [input.is_guest = false]
   * @param {boolean} [input.is_deleted = false]
   */
  constructor(input = Object.create(null)) {
    this.id = input.id ? input.id : null;
    this.jid = input.jid ? input.jid : null;
    this.name = input.name ? input.name : '';
    this.mention_name = input.mention_name ? input.mention_name : '';
    this.email = input.email ? input.email : '';
    this.title = input.title ? input.title : null;
    this.photo_url = input.photo_url ? input.photo_url : '';
    this.version = input.version ? input.version : '';
    this.is_guest = input.is_guest ? input.is_guest : false;
    this.is_deleted = input.is_deleted ? input.is_deleted : false;
  }

  /**
   * Create a User model from an individual item in a roster push. Roster pushes may
   * contain 1 or more items (users), so the caller should be responsible for iterating
   * over the list and calling this method to convert the item xml node into a user model
   *
   * <iq xmlns='jabber:client' to='1_4@chat.devvm.hipchat.com/web-15499||proxy|devvm.hipchat.com|5222' type='set'>
   *   <query xmlns='jabber:iq:roster' ver='2016-04-27T20:16:36Z'>
   *     <item jid='1_2520@chat.devvm.hipchat.com'
   *       name='Art Cronin 61'
   *       id='2520'
   *       mention_name='ArtCronin61'
   *       mobile="iphone" <!-- or android or this attribute does not exist -->
   *       version='18EA5095'
   *       subscription='both'
   *       email='art.cronin61@atlassian.com'
   *       photo_url='https://secure.gravatar.com/avatar/bcd6031e23dfb85bbf7c8aac0d3989df?s=125&amp;r=g&amp;d=https%3A%2F%2Fdevvm.hipchat.com%2Fimg%2Fsilhouette_125.png'/>
   *   </query>
   * </iq>
   *
   * @static
   * @method fromXMPP
   * @param item - the "item" node for a given roster update (not the whole iq)
   * @returns {User}
   */
  static fromXMPP(item) {

    let id = item.hasAttribute('id') ?
      parseInt(item.getAttribute('id'), 10) : utils.jid.user_id(item.getAttribute('jid'));

    return new User({
      id,
      jid: item.getAttribute('jid'),
      name: item.getAttribute('name'),
      mention_name: item.getAttribute('mention_name'),
      email: item.getAttribute('email'),
      photo_url: item.getAttribute('photo_url'),
      version: item.getAttribute('version'),
      is_deleted: item.getAttribute('subscription') === 'remove',
      is_guest: false, // Guest users are not broadcast via roster pushes
      title: null      // We only get this value via xmpp from requesting the user's profile (sadplanet)
    });
  }

  /*
   * Example IQ from profile query. This gives us basically the same information, but
   * does NOT include the version hash. It is, however, the only endpoint that give us
   * the user's timezone offset value -- which we need to calculate their local time in
   * the 1:1 chat headers. We currently store the parsed result of this IQ as a "profile"
   * in several places in the app, and we should probably just merge it into the roster
   * to fully flesh out the user item. Because of this, however, we have no single way
   * to get ALL a user's information (feelsbadman)
   *
   * <iq xmlns='jabber:client' type='result' from='1_2530@chat.devvm.hipchat.com'
   *   id='3b1b70d3-b4f8-48a2-a46e-a20b99ff373b:sendIQ' to='1_4@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222'>
   *   <query xmlns='http://hipchat.com/protocol/profile'>
   *     <email>mattye.veum69@atlassian.com</email>
   *     <name>Mattye Veum</name>
   *     <mention_name>MattyeVeum69</mention_name>
   *     <photo_large>https://secure.gravatar.com/avatar/ea536d6e64288e112e736131589dc1f1?s=125&amp;r=g&amp;d=https%3A%2F%2Fdevvm.hipchat.com%2Fimg%2Fsilhouette_125.png</photo_large>
   *     <photo_small>https://secure.gravatar.com/avatar/ea536d6e64288e112e736131589dc1f1?s=36&amp;r=g&amp;d=https%3A%2F%2Fdevvm.hipchat.com%2Fimg%2Fsilhouette_36.png</photo_small>
   *     <timezone utc_offset='0.0'>UTC</timezone>
   *     <title>Atlassian Member</title>
   *   </query>
   * </iq>
   */

  /*
   * Guest users are not included when you sync or query the roster. You only know about them
   * when you get a presence telling you they joined a room. We currently create a partial user
   * object from this stanza and add them to our internal roster. They are never cached.
   *
   * <presence xmlns='jabber:client' to='1_4@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222'
   *   from='1_coral-1@conf.devvm.hipchat.com/a guest'>
   *   <x xmlns='http://jabber.org/protocol/muc#user'>
   *     <item mention_name='aguestGuest'
   *       affiliation='member'
   *       jid='1_5656@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222'
   *       role='visitor'/>
   *   </x>
   * </presence>
   */

  /**
   * Returns a user model from the coral rest user representation pulled down
   * in the sync api. Updated user looks like:
   * {
   *   "email": "extraneous@example.com",
   *   "id": 5655,
   *   "is_guest": false,
   *   "links": {
   *     "self": "https://devvm.hipchat.com/v2/user/5655"
   *     },
   *   "mention_name": "extraneous",
   *   "name": "extraneous",
   *   "photo_url": "https://secure.gravatar.com/avatar/13958a29d8b9f8361ce8d1dd8c277dc8?s=125&r=g&d=https%3A%2F%2Fdevvm.hipchat.com%2Fimg%2Fsilhouette_125.png",
   *   "timezone": "UTC",
   *   "title": "",
   *   "version": "00000000",
   *   "xmpp_jid": "1_5655@chat.devvm.hipchat.com"
   * }
   *
   * Deleted user looks like:
   * {
   *   "id": 123,
   *   "is_deleted": true
   * }
   *
   * The timezone value received from Coral is a string-name (UTC, US/Central),
   * which is pretty useless for us unless we maintain a dictionary of
   * these strings -> utc offsets. txhipchat is using http://pythonhosted.org/pytz
   * which contains a binary database of these mappings
   *
   * @static
   * @method fromREST
   * @param {object} json
   * @returns {User}
   */
  static fromREST(json) {
    return new User({
      id: json.id,
      jid: json.xmpp_jid,
      name: json.name,
      mention_name: json.mention_name,
      email: json.email,
      title: json.title,
      photo_url: json.photo_url,
      version: json.version,
      is_guest: json.is_guest,
      is_deleted: json.is_deleted
    });
  }

  /**
   * Converts user model back to the x2js version for
   * backwards compatibility until we can model all
   * the way thru the app
   * @param {User} user
   * @returns {object}
   */
  static asX2JS(user) {
    let x2js = {
      id: user.id,
      jid: user.jid,
      name: user.name,
      mention_name: user.mention_name,
      email: user.email,
      title: user.title,
      photo_url: user.photo_url,
      version: user.version
    };

    if (user.subscription) {
      x2js.subscription = user.subscription;
    } else if (user.is_deleted) {
      x2js.subscription = 'remove';
    } else if (!user.is_guest) {
      x2js.subscription = '';
    }

    return x2js;
  }


}


/** WEBPACK FOOTER **
 ** ./src/js/core/models/user.js
 **/