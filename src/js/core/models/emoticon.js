
/**
 * Valid emoticon type values
 */
export const EmoticonTypes = Object.freeze({
  GLOBAL: 'global',
  GROUP: 'group'
});

/**
 * Reasonable default values for the emoticon object
 */
const Defaults = Object.freeze({
  ID: null,
  SHORTCUT: '',
  PATH: '',
  W: 30,
  H: 30,
  TYPE: EmoticonTypes.GROUP
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
 * @class Emoticon
 *
 * @property {number} id
 * @property {string} shortcut
 * @property {string} path
 * @property {number} w
 * @property {number} h
 * @property {string} type
 */
export default class Emoticon {

  /**
   * @constructs
   * @param {object} input
   * @param {string|number} input.id
   * @param {string} input.shortcut
   * @param {string} input.path
   * @param {string|number} input.w
   * @param {string|number} input.h
   * @param {string} input.type
   */
  constructor(input = Object.create(null)) {
    this.id = input.id ? parseInt(input.id, 10) : Defaults.ID;
    this.shortcut = input.shortcut || Defaults.SHORTCUT;
    this.path = input.path || Defaults.PATH;
    this.w = input.w ? parseInt(input.w, 10) : Defaults.W;
    this.h = input.h ? parseInt(input.h, 10) : Defaults.H;
    this.type = input.type || Defaults.TYPE;
  }

  /**
   * Takes an IQ result from a iq query for emoticons, and returns
   * a Emoticon model. IQ looks like:
   *
   * <iq xmlns="jabber:client" to="" type="{set|result}">
   *  <query xmlns="http://hipchat.com/protocol/emoticons">
   *    <path_prefix>https://dujrsrsgsd3nh.cloudfront.net/img/emoticons</path_prefix>
   *    <item>
   *      <id>560651</id>
   *      <path>10804/troll-1467393875.png</path>
   *      <shortcut>troll</shortcut>
   *      <w>30</w>
   *      <h>26</h>
   *      <type>group</type>
   *    </item>
   *  </query>
   * </iq>
   *
   * @static
   * @method fromXMPP
   * @param item - xml <item> element from a iq query for emoticons
   * @returns {Emoticon}
   */
  static fromXMPP(item) {
    return new Emoticon({
      id: queryContent(item, 'id'),
      shortcut: queryContent(item, 'shortcut'),
      path: queryContent(item, 'path'),
      w: queryContent(item, 'w'),
      h: queryContent(item, 'h'),
      type: queryContent(item, 'type')
    });
  }

  /**
   * Converts emoticon model back to the x2js version for
   * backwards compatibility until we can model all
   * the way thru the app
   * @param {Emoticon} emoticon
   * @returns {object}
   */
  static asX2JS (emoticon) {
    return {
      id: String(emoticon.id),
      shortcut: emoticon.shortcut,
      path: emoticon.path,
      w: String(emoticon.w),
      h: String(emoticon.h),
      type: emoticon.type
    };
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/models/emoticon.js
 **/