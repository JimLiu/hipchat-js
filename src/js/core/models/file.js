import utils from 'helpers/utils';
import * as NS from 'core/xmpp/lib/namespaces';
import ConfigStore from 'stores/configuration_store';

export function getAuthenticatedFileUrl (id, thumbnail = false) {
  var api_host = ConfigStore.get('api_host'),
      thumb = thumbnail ? '?thumbnail=true' : '';
  return `https://${api_host}/v2/file/${id}${thumb}`;
}

/**
 * @class File
 *
 * @property {number} id
 * @property {string} name
 * @property {string} desc
 * @property {number} size
 * @property {string} date
 * @property {string} url
 * @property {string} thumb_url
 * @property {number} group_id
 * @property {number} user_id
 * @property {string} auth_scheme
 *
 * Derived properties
 * @property {string} file_type
 * @property {string} file_name
 * @property {string} file_ext
 * @property {string} file_size
 * @property {boolean} is_authenticated
 */

export default class File {

  /**
  * @constructs
  * @param {object} input
  * @param {string|null} input.id
  * @param {string} input.name
  * @param {string} input.desc
  * @param {string|number} input.size
  * @param {string} input.date
  * @param {string|null} input.url
  * @param {string|null} input.thumb_url
  * @param {string|null} input.group_id
  * @param {string|null} input.user_id
  * @param {string|null} input.auth_scheme
  * @param {boolean} input.is_authenticated
  */
  constructor(input = Object.create(null)) {
    this.id = input.id || null;
    this.name = input.name || '';
    this.desc = input.desc || '';
    this.size = parseInt(input.size, 10) || 0;
    this.date = input.date ? new Date(input.date) : '';
    this.url = input.is_authenticated ? getAuthenticatedFileUrl(input.id, false) : (input.url || null);
    this.thumb_url = input.is_authenticated ? getAuthenticatedFileUrl(input.id, true) : (input.thumb_url || null);
    this.group_id = parseInt(input.group_id, 10) || null;
    this.user_id = parseInt(input.user_id, 10) || null;
    this.auth_scheme = input.auth_scheme || '';
    this.is_authenticated = input.is_authenticated || false;

    // Derive props
    this.file_name = this.name.split('/').pop();
    this.file_type = utils.file.get_file_type(this.name, true);
    this.file_ext = utils.file.get_extension(this.name);
    this.file_size = utils.file.get_size_string(this.size);

    // Preview Thumb
    this.preview_thumbnail = this.file_type === 'img' ? new Image : null;
  }

  /**
   * Takes a file node from a message stanza or IQ query result for a chat's files,
   * and returns a File model. Example stanzas:
   *
   *  Legacy XMPP Message File Node
   *
   *  <message xmlns="jabber:client" type="groupchat"
   *           from="1_example@conf.devvm.hipchat.com/Bob Test"
   *           mid="96d28d5c-99ef-4e32-9b10-e56037fb826c" ts="1456172560.068233"
   *           to="1_1@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222">
   *    <body>File uploaded: https://s3.amazonaws.com/devuploads.hipchat.com/30/263/Lv6iCamVfouH9U3/dean_cain.jpg</body>
   *    <x xmlns="http://hipchat.com/protocol/muc#room">
   *      <file>
   *        <name>30/263/Lv6iCamVfouH9U3/dean_cain.jpg</name>
   *        <desc>test</desc>
   *        <bucket>devuploads.hipchat.com</bucket>
   *        <endpoint>s3.amazonaws.com</endpoint>
   *        <size>12777</size>
   *        <thumb>30/263/Lv6iCamVfouH9U3/dean_cain_thumb.jpg</thumb>
   *        <thumb_url>https://s3.amazonaws.com/devuploads.hipchat.com/30/263/Lv6iCamVfouH9U3/dean_cain_thumb.jpg</thumb_url>
   *        <file_url>https://s3.amazonaws.com/devuploads.hipchat.com/30/263/Lv6iCamVfouH9U3/dean_cain.jpg</file_url>
   *      </file>
   *    </x>
   *    <delay from_jid="30_263@chat.devvm.hipchat.com" stamp="2016-01-04T22:28:11Z" xmlns="urn:xmpp:delay"/>
   *  </message>
   *
   *  Legacy XMPP IQ File List Query
   *
   *  <iq from="1_1@chat.hipchat.com" id="1" type="result">
   *    <query xmlns="http://hipchat.com/protocol/files">
   *      <item>
   *        <id>2</id>
   *        <name>10803/29833/randomchars/lolwut.png</name>
   *        <thumbnail>10803/29833/rnd/lolwut_thumb.png</thumbnail>
   *        <bucket>downloads.hipchat.com</bucket>
   *        <size>1803</size>
   *        <desc>OMG LOLWUT</desc>
   *        <group_id>10803</group_id>
   *        <user_id>29833</user_id>
   *        <date>2013-03-10T12:00:00Z</date>
   *        <authenticated>0</authenticated>
   *        <file_url>https://s3.amazonaws.com/devuploads.hipchat.com/10803/29833/rnd/lolwut.png</file_url>
   *        <thumb_url>https://s3.amazonaws.com/devuploads.hipchat.com/10803/29833/rnd/lolwut_thumb.png</thumb_url>
   *      </item>
   *      <item>...</item>
   *      <item>...</item>
   *    </query>
   *  </iq>
   *
   *  Signed XMPP File Node
   *
   *  <message>
   *    <body>User description: https://api.hipchat.com/v2/file/file_id</body>
   *    <delay xmlns="urn:xmpp:delay" from_jid="..." stamp="..."/>
   *    <authenticated_file xmlns="http://hipchat.com/protocol/file">
   *      <desc>User description</desc>
   *      <id>7c2f5173-c9f9-4840-8471-eca32ab8151b</id>
   *      <date>2013-03-10T12:00:00Z</date>
   *      <name>filename.txt</name>
   *      <size>12777</size>
   *      <group_id>10803</group_id>
   *      <user_id>29833</user_id>
   *      <auth_scheme>bearer</auth_scheme>
   *    </authenticated_file>
   *    <x xmlns="...">
   *      HipChat custom x element
   *    </x>
   *  </message>
   *
   *  Signed XMPP IQ File List Query
   *
   *   <iq from="1_1@chat.hipchat.com" id="1" type="result">
   *     <query xmlns="http://hipchat.com/protocol/file">
   *       <authenticated_file>
   *         <id>7c2f5173-c9f9-4840-8471-eca32ab8151b</id>
   *         <desc>User description</desc>
   *         <date>2013-03-10T12:00:00Z</date>
   *         <name>filename.txt</name>
   *         <size>12777</size>
   *         <group_id>10803</group_id>
   *         <user_id>29833</user_id>
   *         <auth_scheme>bearer</auth_scheme>
   *       </authenticated_file>
   *       <authenticated_file>...</authenticated_file>
   *       <authenticated_file>...</authenticated_file>
   *     </query>
   *   </iq>
   *
   * @static
   * @method fromXMPP
   * @param xmpp - xml result from a iq or message
   * @returns {File}
   */
  static fromXMPP(file) {
    var url, is_authenticated;

    function queryContent(name, defaultVal = null) {
      var node = file.querySelector(name);
      return _.get(node, 'textContent', defaultVal);
    }

    // <authenticated_file> node has the secure file namespace or is in a <query> node that does
    if (file.getAttribute('xmlns') === NS.HC_AUTHENTICATED_FILE || file.nodeName === 'authenticated_file') {
      url = queryContent('url');
      is_authenticated = true;

    } else {
      url = queryContent('file_url');
      is_authenticated = false;
    }

    return new File({
      id: queryContent('id'),
      name: queryContent('name', ''),
      desc: queryContent('desc', ''),
      size: queryContent('size', 0),
      date: new Date(queryContent('date', '')),
      url,
      thumb_url: queryContent('thumb_url', ''),
      group_id: queryContent('group_id'),
      user_id: queryContent('user_id'),
      auth_scheme: queryContent('auth_scheme'),
      is_authenticated
    });
  }

  /**
  * Returns file model from the rest message representation. This is for fetching
  * recent message history for a room via Coral.
  *
  * NOTE: This is not currently in use. It's here in anticipation of a Strophe
  *       plugin implementation for messages.
  *
  * Legacy File
  *
  * {
  *   "date": "2016-02-19T22:10:27.764729+00:00",
  *   "file": {
  *     "name": "IMG_1498.jpg",
  *     "size": 1392206,
  *     "thumb_url": "https://s3.amazonaws.com/devuploads.hipchat.com/1/2/XdKMxPuW12nbHyf/IMG_1498_thumb.jpg",
  *     "url": "https://s3.amazonaws.com/devuploads.hipchat.com/1/2/XdKMxPuW12nbHyf/IMG_1498.jpg"
  *   },
  *   "from": {
  *     "id": 2,
  *     "links": {
  *       "self": "https://devvm.hipchat.com/v2/user/2"
  *     },
  *     "mention_name": "BobTest",
  *     "name": "Bob Test",
  *     "version": "VT20ETYG"
  *   },
  *   "id": "e089070f-6918-43bb-8868-eb9d65f225eb",
  *   "mentions": [],
  *   "message": "Here's that picture you wanted.",
  *   "type": "message"
  * }
  *
  * Signed File
  *
  * {
  *   "date": "2016-02-19T22:10:27.764729+00:00",
  *   "authenticated_file": {
  *     "id": "7c2f5173-c9f9-4840-8471-eca32ab8151b",
  *     "name": "IMG_1498.jpg",
  *     "size": 1392206
  *   },
  *   "from": {
  *     "id": 2,
  *     "links": {
  *       "self": "https://devvm.hipchat.com/v2/user/2"
  *     },
  *     "mention_name": "BobTest",
  *     "name": "Bob Test",
  *     "version": "VT20ETYG"
  *   },
  *   "id": "e089070f-6918-43bb-8868-eb9d65f225eb",
  *   "mentions": [],
  *   "message": "Here's that picture you wanted.",
  *   "type": "message"
  * }
  *
  * @static
  * @method fromREST
  * @param {object} json
  * @returns {File}
  */
  static fromREST(json) {
    var file = json.authenticated_file,
        is_authenticated = true;

    if (!file) {
      file = json.file;
      is_authenticated = false;
    }

    return new File({
      id: file.id,
      name: file.name,
      desc: json.message,
      size: file.size,
      date: json.date,
      url: file.url,
      thumb_url: file.thumb_url,
      is_authenticated
    });
  }

  /**
   * Returns a file model from the XML2JSON representation of a message stanza
   * received via XMPP or the JSON representation of a message fetched via Coral.
   *
   * NOTE: This is a temporary solution until a Strophe plugin is built to handle
   *       processing messages which would use the `fromXMPP` and `fromREST` methods.
   *
   * Legacy FileModel:
   *
   * {
   *   "date": "2016-02-19T22:10:27.764729+00:00",
   *     "x": {
   *       "xmlns": "http://hipchat.com/protocol/muc#room",
   *       "file": {
   *       "name": "30/263/Lv6iCamVfouH9U3/dean_cain.jpg",
   *       "desc": "test",
   *       "bucket": "devuploads.hipchat.com",
   *       "endpoint": "s3.amazonaws.com",
   *       "size": "12777",
   *       "thumb": "30/263/Lv6iCamVfouH9U3/dean_cain_thumb.jpg",
   *       "thumb_url": "https://s3.amazonaws.com/devuploads.hipchat.com/30/263/Lv6iCamVfouH9U3/dean_cain_thumb.jpg",
   *       "file_url": "https://s3.amazonaws.com/devuploads.hipchat.com/30/263/Lv6iCamVfouH9U3/dean_cain.jpg"
   *     }
   *   }
   *   "from": {
   *     "id": 2,
   *     "links": {
   *       "self": "https://devvm.hipchat.com/v2/user/2"
   *     },
   *     "mention_name": "BobTest",
   *     "name": "Bob Test",
   *     "version": "VT20ETYG"
   *   },
   *   "id": "e089070f-6918-43bb-8868-eb9d65f225eb",
   *   "mentions": [],
   *   "message": "Here's that picture you wanted.",
   *   "type": "message"
   * }
   *
   * Signed FileModel:
   *
   * {
   *   "date": "2016-02-19T22:10:27.764729+00:00",
   *   "authenticated_file": {
   *     "xmlns": "http://hipchat.com/protocol/muc#room",
   *     "id": "7c2f5173-c9f9-4840-8471-eca32ab8151b",
   *     "desc": "User description",
   *     "id": "7c2f5173-c9f9-4840-8471-eca32ab8151b",
   *     "date": "2013-03-10T12:00:00Z",
   *     "name": "filename.txt",
   *     "size": "12777",
   *     "group_id": "10803",
   *     "user_id": "29833",
   *     "auth_scheme": "bearer"
   *   }
   *   "from": {
   *     "id": 2,
   *     "links": {
   *       "self": "https://devvm.hipchat.com/v2/user/2"
   *     },
   *     "mention_name": "BobTest",
   *     "name": "Bob Test",
   *     "version": "VT20ETYG"
   *   },
   *   "id": "e089070f-6918-43bb-8868-eb9d65f225eb",
   *   "mentions": [],
   *   "message": "Here's that picture you wanted.",
   *   "type": "message"
   * }
   *
   * @static
   * @method fromMessageObject
   * @param {object} msg
   * @returns {File}
   */
  static fromMessageObject(msg) {
    var file = msg.authenticated_file,
        url, desc, is_authenticated;

    // Secure file
    if (file) {
      url = file.url;
      is_authenticated = true;

    // Legacy file
    } else {
      // via XMPP
      if (msg.x) {
        file = Array.isArray(msg.x) ? msg.x[0].file : msg.x.file;
        url = file.file_url;
      // via API
      } else {
        file = msg.file;
        url = file.url;
      }
      is_authenticated = false;
    }

    // Use the file desc for XMPP
    if (file.desc !== undefined && !msg.replace) {
      desc = file.desc || '';

    // Use the message body for REST
    } else {
      desc = msg.body || msg.message;
    }

    return new File({
      id: file.id,
      name: file.name,
      desc,
      size: file.size,
      date: file.date || msg.date,
      url,
      thumb_url: file.thumb_url,
      group_id: file.group_id,
      user_id: file.user_id,
      auth_scheme: file.auth_scheme,
      is_authenticated
    });
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/models/file.js
 **/