import AbstractPlugin from './abstract_plugin';
import * as NS from '../lib/namespaces';
import XMPPUtils from '../lib/xmpp-utils';
import DALError from 'core/models/dal-error';
import File from 'core/models/file';

export default class ChatPlugin extends AbstractPlugin {

  init(...args) {
    super.init(...args);
    Strophe.addNamespace('HC_LINKS', NS.HC_LINKS);
    Strophe.addNamespace('HC_FILES', NS.HC_FILES);
  }

  /**
   * Get list of links for a given room/one-to-one.
   * Tetra is not currently honoring the limit parameter here -- HC-28429
   *
   * @param {string} jid
   * @param {date} [before=null]
   * @param {date} [after=null]
   * @param {number} [limit=50]
   * @returns {Promise<ChatLinksResponse, DALError>}
   */
  getLinks(jid, before, after, limit = 50) {
    let query = {
      xmlns: Strophe.NS.HC_LINKS,
      limit: limit
    };

    if (before) {
      query.before = XMPPUtils.toXMPPDate(before);
    } else if (after) {
      query.after = XMPPUtils.toXMPPDate(after);
    }

    let stanza = $iq({ type: 'get', to: jid }).c('query', query);

    return new Promise((resolve, reject) => {
      let success = (xmpp) => {
        resolve(this._processLinksResponse(xmpp, before, limit));
      };

      let error = (xmpp) => {
        reject(DALError.fromXMPP(xmpp));
      };

      this.Connection.sendIQ(stanza.tree(), success, error);
    });
  }

  /**
   * Get list of files for a given room/one-to-one
   * Tetra is not currently honoring the limit parameter here -- HC-28429
   *
   * @param {string} jid
   * @param {date} [before=null]
   * @param {date} [after=null]
   * @param {number} [limit=50]
   * @returns {Promise<ChatFilesResponse, DALError>}
   */
  getFiles(jid, before, after, limit = 50) {
    let query = {
      xmlns: Strophe.NS.HC_FILES,
      limit: limit
    };

    if (before) {
      query.before = XMPPUtils.toXMPPDate(before);
    } else if (after) {
      query.after = XMPPUtils.toXMPPDate(after);
    }

    let stanza = $iq({ type: 'get', to: jid })
                    .c('query', query)
                    .c('auth_scheme', 'bearer');

    return new Promise((resolve, reject) => {
      let success = (xmpp) => {
        resolve(this._processFilesResponse(xmpp, before, limit));
      };

      let error = (xmpp) => {
        reject(DALError.fromXMPP(xmpp));
      };

      this.Connection.sendIQ(stanza.tree(), success, error);
    });
  }

  /**
   * Process successful links query iq response:
   *
   * <iq xmlns='jabber:client' type='result' from='10804_samar@conf.hipchat.com' id='15:sendIQ' to='10804_220836@chat.hipchat.com/web||proxy|proxy-b301.hipchat.com|5252'>
   *  <query xmlns='http://hipchat.com/protocol/links'>
   *    <item>
   *      <id>246769778</id>
   *      <group_id>10804</group_id>
   *      <user_id>3197019</user_id>
   *      <url>https://austin.craigslist.org/hsh/5369067832.html</url>
   *      <date>2016-01-11T16:45:22Z</date>
   *    </item>
   *    ...
   *  </query>
   * </iq>
   *
   * @param xmpp
   * @param before
   * @param limit
   * @returns {ChatLinksResponse}
   * @private
   */
  _processLinksResponse(xmpp, before, limit) {
    let query = xmpp.getElementsByTagNameNS(Strophe.NS.HC_LINKS, 'query')[0],
      jid = Strophe.getBareJidFromJid(xmpp.getAttribute('from')),
      items = query.querySelectorAll('item'),
      end = items.length < limit;

    /**
     * @typedef {Object} ChatLink
     * @property {number} id
     * @property {number} group_id
     * @property {number} user_id
     * @property {string} url
     * @property {date} date
     * @property {string} name
     */
     let links = _.map(items, (item) => ({
        id: parseInt(item.querySelector('id').textContent, 10),
        group_id: parseInt(item.querySelector('group_id').textContent, 10),
        user_id: parseInt(item.querySelector('user_id').textContent, 10),
        url: item.querySelector('url').textContent,
        date: new Date(item.querySelector('date').textContent),
        name: item.querySelector('url').textContent.split('/').pop()
      }));

      links = _.orderBy(links, 'date', 'desc');

    /*
     * NOTE: HipChat Server v1.3.1 and lower do not honor the "before" param
     * in the fetchLinks api, so you'll get the same result set back on every
     * request. This check is to ensure the links we just got back are indeed
     * older than what was requested.
     */
    let oldestLinkDate = _.get(_.last(links), 'date');
    if (links.length && before && before - oldestLinkDate <= 0) {
      links = [];
      end = true;
    }

    /**
     * @typedef {Object} ChatLinksResponse
     * @property {string} jid
     * @property {boolean} end
     * @property {Array<ChatLink>} links
     */
    return { jid, links, end };
  }

  /**
   * Process successful files query iq response. Using the File model to normalize
   * authenticated/secure files and unauthenticated/legacy files. See the model
   * for sample data and details on the returned File object.
   *
   * @param xmpp
   * @param before
   * @param limit
   * @returns {ChatFilesResponse}
   * @private
   */
  _processFilesResponse(xmpp, before, limit) {
    let query = xmpp.getElementsByTagNameNS(Strophe.NS.HC_FILES, 'query')[0],
        jid = Strophe.getBareJidFromJid(xmpp.getAttribute('from')),
        items, end;

    items = query.querySelectorAll('authenticated_file');
    if (items.length === 0) {
      items = query.querySelectorAll('item');
    }
    end = items.length < limit;

    let files = _.map(items, (item) => {
      return File.fromXMPP(item);
    });

    /*
     * NOTE: HipChat Server v1.3.1 and lower do not honor the "before" param
     * in the fetchFiles api, so you'll get the same result set back on every
     * request. This check is to ensure the files we just got back are indeed
     * older than what was requested.
     */
    let oldestFileDate = _.get(_.last(files), 'date');
    if (files.length && before && before - oldestFileDate <= 0) {
      files = [];
      end = true;
    }

    /**
     * @typedef {Object} ChatFilesResponse
     * @property {string} jid
     * @property {boolean} end
     * @property {Array<File>} files
     */
    return { jid, files, end };
  }

}



/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/plugins/chat_plugin.js
 **/