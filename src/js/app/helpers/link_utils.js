import moment from 'moment';
import regex_helpers from 'helpers/regex_helpers';
import jid_utils from 'helpers/jid_utils';

export default {

  url_regex: new RegExp(regex_helpers.url, "i"),
  urls_regex: new RegExp(regex_helpers.url, "gi"),
  url_end_punct_regex: new RegExp(regex_helpers.url_end_punctuation),
  paired_punctuation: {
    "}": "{",
    ")": "(",
    ">": "<"
  },

  /**
   * Remove the query string from a url
   *
   * @method remove_query_string
   * @param {String} url
   * @returns {String} url without query string
   */
  remove_query_string: (url) => {
    return url.split(/[?#]/)[0];
  },

  /**
   * Creates a link object
   *
   * @method create_link_object
   * @param {String} jid
   * @param {String} ts
   * @param {String} url
   * @param {String} sender_name
   * @returns {Object} a link object
   */
  create_link_object: function (jid, ts, url, sender_name) {
    var protocol_re = new RegExp(regex_helpers.protocol, 'i');
    if (!protocol_re.test(url)){
      url = `http://${url}`;
    }
    return {
      date: moment.utc(ts * 1000).toDate(),
      group_id: jid_utils.group_id(jid),
      id: _.uniqueId(),
      user_name: sender_name,
      url: url,
      display_url: url.replace(/.*?:\/\//g, "")
    };
  },

  /**
   * Gets the urls from a string
   *
   * @method get_urls_from_string
   * @param {String} input
   * @returns {Array} array of urls found in the input
   */
  get_urls_from_string: function (input) {
    return input.match(this.urls_regex);
  },

  /**
   * Determines if the string contains a url
   *
   * @method contains_url
   * @param {String} input
   * @returns {Boolean}
   */
  contains_url: function (input) {
    return this.url_regex.test(input);
  },

  /**
   * Removes the resolution from a url (@2x.jpg, etc...)
   *
   * @method remove_resolution
   * @param {String} url
   * @returns {String} url without the resolution
   */
  remove_resolution(url){
    return url.replace(/@\d+x/i, "");
  },

  /**
   * If the last character of the url match ends in a punctuation character
   * and the match index is not at the beginning of the text input,
   * we should remove the last character of the match
   *  ex: (http://en.wikipedia.org/wiki/PC_Tools_(Central_Point_Software)) should not convert the last
   *  parenthesis as part of the link
   *
   * @method wrapped_url_fix
   * @param {String} input
   * @param {String} match
   * @returns {String} url
   */
  wrapped_url_fix(input, match) {
    let match_index = input.indexOf(match);
    let last_char_of_match = input.charAt(match_index + (match.length - 1));
    let is_matched = this.url_end_punct_regex.test(last_char_of_match);

    if (is_matched && this._should_slice(input, match)) {
      return this.wrapped_url_fix(input, match.slice(0, -1));
    }

    return match;
  },

  /**
   * Checks if the number of character is balanced
   * (e.g. "http://wikipedia.org/Curry(Computer Science)" returns true
   * but "http://wikipedia.org/Curry(Computer Science))" returns false)
   *
   * @param {String} Input
   * @param {String} Last matching character
   * @returns {Boolean}
   */
  _num_of_chars_balanced(match ,close_punctuation) {
    let open_punctuation = this.paired_punctuation[close_punctuation];

    // Use square brackets for non-escaping
    let rule_for_open = new RegExp(`[${open_punctuation}]`, 'g');
    let rule_for_close = new RegExp(`[${close_punctuation}]`, 'g');

    let open_matches = match.match(rule_for_open) || [];
    let close_matches = match.match(rule_for_close) || [];

    return open_matches.length === close_matches.length ? true : false;
  },

  /**
   * Check if the last character should be removed
   * @param input
   * @param match
   * @returns {boolean}
   * @private
   */
  _should_slice(input, match) {
    let match_index = input.indexOf(match);
    let last_char = input.charAt(match_index + (match.length - 1));

    if (this.paired_punctuation[last_char]) {
      if (!this._num_of_chars_balanced(match, last_char)) {
        return true;
      }

      return false;
    }

    return true;
  },

  /**
   * If the first character after the match is not url end punctuation
   * we should break and not replace the match in the input text
   *  ex: sys.tr would be linkified in "sys.trace" without this fix
   *
   * @method url_should_be_replaced
   * @param {String} input
   * @param {String} match
   * @returns {Boolean}
   */
  url_should_be_replaced(input, match) {
    let match_index = input.indexOf(match);
    let first_char_after_match = input.charAt(match_index + match.length);
    if (first_char_after_match && !this.url_end_punct_regex.test(first_char_after_match)) {
      return false;
    }
    return true;
  },

  /**
   * Indentify that provided input text is invite link like https://hipchat.com/invite/3/dd0f069a19e1df8465287d5291aa347e
   * or http://subdomain.hipchat.com/invite/3/dd0f069a19e1df8465287d5291aa347e?utm_campaign=company_room_link
   *
   * @param {String} input
   * @returns {Boolean}
   */
  identify_invite_link(input){
    let invite_link_regexp = new RegExp(regex_helpers.invite_user_url);
    return invite_link_regexp.test(input);
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/link_utils.js
 **/