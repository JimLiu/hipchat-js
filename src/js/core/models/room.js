import utils from 'helpers/utils';
import * as NS from 'core/xmpp/lib/namespaces';

/**
 * Valid room privacy values
 */
export const PrivacyLevels = Object.freeze({
  PRIVATE: 'private',
  PUBLIC: 'public'
});

/**
 * Reasonable default values for the room object
 */
const Defaults = Object.freeze({
  NAME: "",
  TOPIC: "",
  PRIVACY: PrivacyLevels.PUBLIC,
  AVATAR_URL: "",
  ID: null,
  JID: "",
  GUEST_URL: "",
  OWNER: null,
  IS_ARCHIVED: false,
  IS_DELETED: false,
  VERSION: "00000000"
});

/**
 * Returns the textContent value of the node that is found when querying the root node passed in for the element that
 * returns from a querySelector search for the `name` value specified.
 *
 * @param {Document} root xml
 * @param {string} name the name of the tag you're looking for
 * @param defaultVal what to return if nothing is found
 *
 * @returns {string|null}
 */
let queryContent = (root, name, defaultVal = null) => {
  var node = root.querySelector(name);
  return _.get(node, 'textContent', defaultVal);
};

/**
 * @class Room
 *
 * @property {string} name
 * @property {string} privacy (public or private)
 * @property {string} topic
 * @property {string} jid
 * @property {string} version
 * @property {int} owner
 * @property {int} id
 * @property {boolean} is_archived
 * @property {string} guest_url
 * @property {string} avatar_url
 */
export default class Room {

  /**
   * @constructs
   * @param {object} input
   * @param {string} input.name
   * @param {string} [input.privacy="public"]
   * @param {string} [input.topic=""]
   * @param {string} input.version
   * @param {string|null} input.avatar_url
   * @param {string|number} input.id
   * @param {string} input.jid
   * @param {string|null} input.guest_url
   * @param {string|number} input.owner
   * @param {boolean} [input.is_archived]
   * @param {boolean} [input.is_deleted]
   */
  constructor(input = Object.create(null)) {
    this.name = input.name || Defaults.NAME;
    this.topic = input.topic || Defaults.TOPIC;
    this.privacy = input.privacy || Defaults.PRIVACY;
    this.version = input.version || Defaults.VERSION;
    this.avatar_url = input.avatar_url || Defaults.AVATAR_URL;
    this.id = input.id ? parseInt(input.id, 10) : Defaults.ID;
    this.jid = input.jid || Defaults.JID;
    this.guest_url = input.guest_url || Defaults.GUEST_URL;
    this.owner = input.owner ? parseInt(input.owner, 10) : Defaults.OWNER;
    this.is_archived = utils.coerceBoolean(input.is_archived, Defaults.IS_ARCHIVED);
    this.is_deleted = utils.coerceBoolean(input.is_deleted, Defaults.IS_DELETED);
  }

  /**
   * Takes an IQ result from a disco#info query for a room, and returns
   * a Room model. IQ looks like:
   *
   * <iq xmlns="jabber:client" type="result" from="${room_jid}" id="" to="">
   *   <query xmlns="http://jabber.org/protocol/disco#info">
   *     <identity category="conference" type="text" name="${room_name}" />
   *     <feature var="http://jabber.org/protocol/muc" />
   *     <feature var="muc_membersonly" />
   *     <x xmlns="http://hipchat.com/protocol/muc#room">
   *       <id>${room_id}</id>
   *       <topic>${room_topic}</topic>
   *       <privacy>${room_privacy}</privacy>
   *       <owner>${room_owner_jid}</owner>
   *       <guest_url />
   *       <is_archived /> // only present if true
   *       <version>${room_version_hash}</version>
   *       <num_participants>0</num_participants>
   *     </x>
   *   </query>
   * </iq>
   *
   * @static
   * @method fromXMPPDiscoInfo
   * @param xmpp - xml result from a disco#info query for a room
   * @returns {Room}
   */
  static fromXMPPDiscoInfo(xmpp) {
    let x = xmpp.getElementsByTagNameNS(NS.HC_MUC_ROOM, 'x')[0],
      identity = xmpp.querySelector('identity'),
      owner = queryContent(x, 'owner');

    return new Room({
      id: queryContent(x, 'id'),
      jid: xmpp.getAttribute('from'),
      owner: owner ? utils.jid.user_id(owner) : null,
      name: identity.getAttribute('name'),
      topic: queryContent(x, 'topic'),
      privacy: queryContent(x, 'privacy'),
      version: queryContent(x, 'version'),
      avatar_url: queryContent(x, 'avatar_url'),
      guest_url: queryContent(x, 'guest_url'),
      is_archived: x.querySelectorAll('is_archived').length > 0,
      is_deleted: false // if room was deleted, disco#info would return a 404
    });
  }

  /**
   * Takes an individual item from a disco_items entry (ie. when you download the
   * entire rooms list) and returns a Room model. Entire IQ result looks like this.
   * This parser is for an individual item node from this list. Caller is responsible
   * for iteration.
   *
   * <iq xmlns='jabber:client' type='result' from='conf.hipchat.com' id='e09bd3e5-5238-4122-99ee-88a1e51dc654:sendIQ'
   *  to='10804_220836@chat.hipchat.com/web||proxy|proxy-c303.hipchat.com|5262'>
   *    <query xmlns='http://jabber.org/protocol/disco#items'>
   *      <item jid='10804_bitbucket@conf.hipchat.com' name='room name'>
   *        <x xmlns='http://hipchat.com/protocol/muc#room'>
   *          <id>22087</id>
   *          <name>room name</name>
   *          <topic>room topic</topic>
   *          <privacy>public</privacy>
   *          <owner>10804_85346@chat.hipchat.com</owner>
   *          <guest_url/>
   *          <version>QX6A723G</version>
   *          <num_participants>0</num_participants>
   *        </x>
   *      </item>
   *    </query>
   * </iq>
   *
   * @static
   * @method from XMPPDiscoItem
   * @param item - individual item node from disco_items iq result
   * @returns {Room}
   */
  static fromXMPPDiscoItem(item) {
    let x = item.getElementsByTagNameNS(NS.HC_MUC_ROOM, 'x')[0],
      name = item.hasAttribute('name') ? item.getAttribute('name') : queryContent(x, 'name'),
      owner = queryContent(x, 'owner');

    return new Room({
      id: queryContent(x, 'id'),
      jid: item.getAttribute('jid'),
      owner: owner ? utils.jid.user_id(owner) : null,
      name: name,
      topic: queryContent(x, 'topic'),
      privacy: queryContent(x, 'privacy'),
      version: queryContent(x, 'version'),
      avatar_url: queryContent(x, 'avatar_url'),
      guest_url: queryContent(x, 'guest_url'),
      is_archived: false, // disco items does not return archived rooms
      is_deleted: false   // disco items does not return deleted rooms
    });
  }

  /**
   * Takes an IQ result from a muc#room query for a room, and returns
   * a Room model. IQ looks like:
   *
   * <iq xmlns='jabber:client' to='1_1@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222' type='set'>
   *   <query xmlns='http://hipchat.com/protocol/muc#room'>
   *     <item jid='1_ii@conf.devvm.hipchat.com' name='Eye Eye'>
   *       <id>693</id>
   *       <name>Eye Eye</name>
   *       <topic>This is room Eye Eye topic</topic>
   *       <privacy>public</privacy>
   *       <owner>1_2@chat.devvm.hipchat.com</owner>
   *       <guest_url/>
   *       <version>8WEKZB9B</version>
   *       <num_participants>0</num_participants>
   *     </item>
   *   </query>
   * </iq>
   *
   * @static
   * @method fromXMPPMucRoom
   * @param item - individual item from a muc#room push iq
   * @returns {Room}
   */
  static fromXMPPMucRoom(item) {
    let owner = queryContent(item, 'owner'),
        name = item.hasAttribute('name') ? item.getAttribute('name') : queryContent(item, 'name');

    return new Room({
      id: queryContent(item, 'id'),
      jid: item.getAttribute('jid'),
      owner: owner ? utils.jid.user_id(owner) : null,
      name: name,
      topic: queryContent(item, 'topic'),
      privacy: queryContent(item, 'privacy'),
      version: queryContent(item, 'version'),
      avatar_url: queryContent(item, 'avatar_url'),
      guest_url: queryContent(item, 'guest_url'),
      is_archived: item.querySelectorAll('is_archived').length > 0,
      is_deleted: item.getAttribute('status') === 'deleted'
    });
  }

  /**
   * Returns room model from the coral rest room representation:
   * {
   *     "avatar_url": null,
   *     "created": "2015-12-29T19:50:02+00:00",
   *     "delegate_admin_visibility": null,
   *     "guest_access_url": null,
   *     "id": 59,
   *     "is_archived": false,
   *     "is_guest_accessible": false,
   *     "last_active": null,
   *     "links": {
   *         "participants": "https://devvm.hipchat.com/v2/room/59/participant",
   *         "self": "https://devvm.hipchat.com/v2/room/59",
   *         "webhooks": "https://devvm.hipchat.com/v2/room/59/webhook"
   *     },
   *     "name": "test room name",
   *     "owner": {
   *         "id": 4,
   *         "links": {
   *             "self": "https://devvm.hipchat.com/v2/user/4"
   *         },
   *         "mention_name": "Homer",
   *         "name": "Homer Simpson",
   *         "version": "VXAKO96E"
   *     },
   *     "participants": [],
   *     "privacy": "public",
   *     "statistics": {
   *         "links": {
   *             "self": "https://devvm.hipchat.com/v2/room/59/statistics"
   *         }
   *     },
   *     "topic": "asdsd",
   *     "version": "GDKMBGDZ",
   *     "xmpp_jid": "1_test-room-name@conf.devvm.hipchat.com"
   * }
   *
   * @static
   * @method fromREST
   * @param {object} json
   * @returns {Room}
   */
  static fromREST(json) {
    // let's convert properties that aren't in the format the constructor expects
    let id = json.id ? parseInt(json.id, 10) : Defaults.ID,
        jid = json.xmpp_jid,
        guest_url = json.guest_access_url,
        owner = json.owner || {};

    return new Room(_.merge(json, {id, jid, guest_url}, {owner: owner.id}));
  }

  /**
   * Converts room model back to the x2js version for
   * backwards compatibility until we can model all
   * the way thru the app
   * @param {Room} room
   * @returns {object}
   */
  static asX2JS (room) {
    return {
      id: room.id,
      jid: room.jid,
      name: room.name,
      version: room.version,
      x: {
        guest_url: room.guest_url,
        id: room.id,
        name: room.name,
        owner: room.owner,
        privacy: room.privacy,
        version: room.version
      }
    };
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/models/room.js
 **/