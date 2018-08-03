import regex_helper from 'helpers/regex_helpers';
import link_utils from 'helpers/link_utils';

const MIN_URL_LENGTH = 4;
const regExpStorage = {
  simple_word: new RegExp(regex_helper.simple_word, 'gi'),
  url: new RegExp(regex_helper.url, 'gi'),
  email: new RegExp(regex_helper.email, 'gi')
};

export default {
  /**
   * Linkify a string, replacing text urls with <a href="url">url</a>
   * Note: init must be called before this function can be used
   *
   * @param text - String to be linkified
   * @param matched_links - Return param (pass by ref) - Array of links matched during linkification
   * @param config - Hash of options for linkifier
   *          add_wbrs (bool) - Add <wbr> tags to displayed text to allow wrapping?
   *          truncate_length (int) - Truncate displayed links to this length
   *          link_target (str) - Target attribute for links
   *          link_titles (bool) - Add titles for links?
   **/
  linkify: function(text, matched_links, config) {
    regExpStorage.simple_word.lastIndex = 0;
    if (text.length >= MIN_URL_LENGTH && !regExpStorage.simple_word.test(text)){
      text = this.match_and_replace(text, true, matched_links, config);
    }
    return text;
  },

  /**
   * Internal helper function for linkification
   **/
  match_and_replace: function(input, add_http, matched_links, config) {
    var start = 0;
    var offset = 0;
    var match_length = 0;
    var end_tag_pos = 0;
    var close_anchor_re = /<\/a>/i;

    var url_re = regExpStorage.url;
    url_re.lastIndex = 0;

    // used in the while loop to check that the entire match is an email rather than an email inside of a larger url
    var email_re = new RegExp('^' + regex_helper.email + '$', 'gi');

    // config
    var add_wbrs = (config.hasOwnProperty("add_wbrs") ? config.add_wbrs : null);
    var truncate_length = (config.hasOwnProperty("truncate_length") ? config.truncate_length : 100);
    var link_target = (config.hasOwnProperty("link_target") ? config.link_target : "_blank");
    var link_titles = (config.hasOwnProperty("link_titles") ? config.link_titles : null);
    var no_referrer = (config.hasOwnProperty("no_referrer") ? config.no_referrer : null);

    var match = {};
    var max_iter = 20;
    var cur_iter = 0;
    while ((match = url_re.exec(input))) {
      cur_iter++;
      if (cur_iter > max_iter) {
        break;
      }

      start = match.index; // start of match

      // If we find an opening a tag, advance to its end and continue looking
      var substr = input.substring(offset, start);
      if (substr.search(/<a/i) >= 0) {
        close_anchor_re.lastIndex = offset;
        var close_anchor_pos = input.substring(offset, input.length).search(close_anchor_re);

        // If we find an opening tag without a matching closing tag, just return the input we have
        if (close_anchor_pos < 0) {
          return input;
        }

        end_tag_pos = close_anchor_pos + offset;

        // RegExp.lastIndex is used to tell the regexp where to start matching
        url_re.lastIndex = end_tag_pos + 4;
        offset = end_tag_pos + 4;

        continue;
      }

      /* if the last character of the url match ends in a punctuation character
       * and the match index is not at the beginning of the text input,
       * we should remove the last character of the match
       *  ex: (http://en.wikipedia.org/wiki/PC_Tools_(Central_Point_Software)) should not convert the last
       *  parenthesis as part of the link
       */
      match[0] = link_utils.wrapped_url_fix(input, match[0]);

      /* if the first character after the match is not url end punctuation
       * we should break and not replace the match in the input text
       *  ex: sys.tr would be linkified in "sys.trace" without this fix
       */
      if (!link_utils.url_should_be_replaced(input, match[0])) {
        break;
      }

      // Do the actual replacement of text with anchor tag
      match_length = match[0].length;
      var address = input.substr(start, match_length);

      // Since we escape before linkifying, we need to make sure that the matched link
      // doesn't actually end with an escaped character (< or >)
      // If it does, move the match backwards so as not to include the escaped character
      var escaped_char_match_pos = address.search(/&(gt|lt)$/);
      if (escaped_char_match_pos > 0 && input.length > start + match_length && input[start + match_length] === ';') {
        var num_chars_matched = address.length - escaped_char_match_pos;
        match_length -= num_chars_matched;
        address = input.substr(start, match_length);
      }
      var actual = address;

      var is_email = email_re.test(actual);

      if (add_http && !match[2] && !is_email) {
        actual = 'http://' + actual;
      }

      var replacement = '<a';

      // link target?
      if (link_target) {
        replacement += ' target="' + link_target + '"';
      }

      if (no_referrer) {
        replacement += ' rel="noopener noreferrer"';
      }

      replacement += ' href="';

      if (is_email) {
        replacement += 'mailto:';
      }

      actual = actual.replace(/"/g, '%22');
      replacement += actual + '"';

      // add title
      if (link_titles) {
        var title = is_email ? 'Email ' + actual : actual;
        replacement += ' title="' + title + '"';
      }

      // Truncate displayed text if requested
      if (truncate_length && address.length > truncate_length) {
        address = address.substr(0, truncate_length) + '...';
      }

      // Add word break tags to allow wrapping where appropriate
      if (add_wbrs) {
        address = address.replace(new RegExp("([/=])", 'g'), "<wbr>$1");
      }

      replacement += '>' + address + '</a>';

      // Record what was matched
      if (matched_links) {
        matched_links.push(actual);
      }

      // Do the replacement
      input = input.slice(0, start) + replacement + input.slice(start + match_length, input.length);
      url_re.lastIndex = start + replacement.length;
      offset = start + replacement.length;
    }

    return input;
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/linkify.js
 **/