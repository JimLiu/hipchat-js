import moment from 'moment';
import linkify from './linkify';
import emoticons from './emoticons';
import file_utils from './file_utils';
import jid_utils from './jid_utils';
import room_utils from './room_utils';
import user_utils from './user_utils';
import video_utils from './video_utils';
import browser_utils, { platform, clientSubType } from './browser_utils';
import version_info from '../version-info.json';
import AppConfig from 'config/app_config';
import URI from 'helpers/uri';

const CONNECT_API_VERSION = version_info.connect_api_version;
var randomBetween = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * utils
 * @module helpers/utils
 */
var utils = {

  TRUNCATE_CHARS: 800,
  TRUNCATE_LINES: 6,

  emoticons: emoticons.init(),
  file: file_utils,
  jid: jid_utils,
  room: room_utils,
  user: user_utils,
  browser: browser_utils,
  video: video_utils,
  platform: platform,
  clientSubType: clientSubType,

  roster_names: {},  // roster names keyed by mention name

  now() {
    return new Date().getTime();
  },

  decorrelatedJitter: function(cap, base, sleep, backoff_factor) {
    return Math.min(cap, randomBetween(base, sleep * backoff_factor));
  },

  escapeRegEx: function(str = '') {
    return str.replace(/[-\\^$*+?.()|\[\]{}]/g, '\\$&');
  },

  getWindowLocation: function () {
    return window.location;
  },

  url: {
    clearWebCookies(webServer) {
      if (_.isString(webServer)) {
        return `https://${webServer}/users/clear_cookies`;
      }
    },

    revokeOauth2Token(apiHost, token) {
      if (_.isString(apiHost) && token) {
        return `https://${apiHost}/v2/oauth/token/${token}`;
      }
    },

    featureFlagsAPI(baseUrl) {
      if (_.isString(baseUrl)) {
        return `${baseUrl}/api/features`;
      }
    },

    networkCheckAPI(apiHost) {
      if (_.isString(apiHost)) {
        return `https://${apiHost}/v2/health-check`;
      }
    }
  },

  /**
   * merges two objects then removes properties with leading underscores
   * if the same property without an underscore already exists
   * @param {object} data
   * @param {object} data
   */
  mergeAndSquash: function (obj1, obj2) {
    var newObj = _.merge(obj1, obj2);
    if ('jid' in newObj) {
      newObj.key = newObj.jid.split('@')[0];
    }
    _.forEach(newObj, function (v, k) {
      if (/^_/.test(k) && newObj.hasOwnProperty(k.substring(1))) {
        delete newObj[k];
      }
    });
    return newObj;
  },

  camelToSnake: function(str) {
    return str.replace(/\W+/g, '_').replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase();
  },

  /**
   * Coerce a boolean from an unknown type value
   * @param {*} val
   * @param {*} [defaultValue=false]
   * @returns {boolean}
   */
  coerceBoolean (val, defaultValue = false) {
    switch (val) {
      case true:
      case 'true':
      case 'True':
      case 1:
      case '1':
        return true;
      case false:
      case 'false':
      case 'False':
      case 0:
      case '0':
        return false;
      default:
        return defaultValue;
    }
  },

  generateMID: function () {
    var d = new Date().getTime();
    var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return id;
  },

  validateMID: function (mid) {
    var re = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
    return re.test(mid);
  },

  getAttachToMid: function(msg) {
    return _.get(msg, 'attach-to.id');
  },

  isAttachedCardsCollapsed(msg, defaultVal = false) {
    return _.get(msg, 'is_attached_cards_collapsed', defaultVal);
  },

  getRealMid(mid){
    return mid.split('-link')[0];
  },

  /**
   *
   * @param {String|Number|undefined} time
   * @param {Boolean} is24hr
   * @returns {String} formatted time in user timezone
   */
  format_time: function (time, is24hr) {
    var format = (is24hr) ? "HH:mm" : "h:mm A";

    if (!time) {
      return this.getCurrentTime().format(format);
    } else if (/^-?\d*\.?\d*$/.test(time)) {
      time = moment.unix(time);
    } else {
      time = moment(time);
    }

    if (!this.getCurrentTime().isSame(time, 'day')) {
      format = 'MMM-D ' + format;
    }

    return time.format(format);
  },

  /**
   * Timestamps are in seconds with microsecond precision.
   * Moment doesn't make this easy so working around it.
   * @param {String} date - an ISO-8691 formatted date string. Example: '2015-10-15T21:28:13.122119+00:00'
   * @returns {Number} timestamp formatted with microsecond precision. Example: 1445022940.211578
   */
  getTimestampFromIsoDate: function(date) {
    var time = moment(date),
        sec = date ? time.unix() : 0,
        micro = date ? date.split('.')[1].split(/\+\d\d|Z/)[0] : 0;

    return Number(sec + '.' + micro);
  },

  getCurrentTime: function() {
    return moment();
  },

  getDateDiff: function(first_date, second_date, unit) {
    var date1 = moment(first_date),
        date2 = moment(second_date);

    return date2.diff(date1, unit);
  },

  format_time_for_history: function (ts) {
    var time = moment.utc(ts, 'X'),
        iso = time.format('YYYY-MM-DDTHH:mm:ss'),
        ms = time.format('SSSSSS');

    return `${iso}Z ${ms}`;
  },

  format_time_for_separator: function (time) {
    return moment.unix(time).format("dddd MMMM D, YYYY");
  },

  getMoment: function (time) {
    var m = time ? moment(time) : moment();
    return parseInt(m.format('x'), 10) / 1000;
  },

  toArray: function (obj) {
    if (_.isArray(obj)) {
      return obj;
    }
    return [obj];
  },

  escape: function (str) {
    if (!str) {
      return str;
    }

    str = str.replace(/&/g, '&amp;');
    str = str.replace(/</g, '&lt;');
    str = str.replace(/>/g, '&gt;');

    return str;
  },

  get_roster_name: function (mention_name) {
    let name = "";
    if (!_.isEmpty(utils.roster_names)) {
      let str = ` ${Object.keys(utils.roster_names).join(' ')} `;
      let regexp = new RegExp(`\\s${mention_name}\\s`, 'i');
      let match = regexp.exec(str);
      if (match){
        name = utils.roster_names[match[0].trim()];
      }
    }
    return name;
  },

  formatMessageBody: function(message) { //This gets extended by the message processor
    return message;
  },

  replaceEmoteMessage: function(messageBody, senderName) {
    return messageBody.replace(AppConfig.emote_regex, senderName + ' ');
  },

  escapeAndLinkify: function(str, args) {

    if (!str){
      return str;
    }

    if (typeof str !== 'string' ) {
      str = str.toString();
    }
    args = _.defaults(args || {}, {
      name_tag_regex: null,
      mention_regex: null,
      escape_whitespace: false,
      matches: null,
      do_escape: true,
      do_linkify: true,
      do_emoticons: true,
      do_word_breaks: true,
      do_mentions: true,
      do_hex_colors: true
    });
    var name_regex = _.result(args, "name_tag_regex");
    var mention_regex = _.result(args, "mention_regex");
    var guest_regex = _.result(args, "guest_regex");
    var escape_whitespace = _.result(args, "escape_whitespace");
    var matches = _.result(args, "matches");
    var do_escape = _.result(args, "do_escape");
    var do_linkify = _.result(args, "do_linkify");
    var do_emoticons = _.result(args, "do_emoticons");
    var do_word_breaks = _.result(args, "do_word_breaks");
    var do_mentions = _.result(args, "do_mentions");
    var do_hex_colors = _.result(args, "do_hex_colors");

    var LINE_SEPARATOR = '\n';
    var TOKEN_SEPARATOR = ' ';

    str = str.split(LINE_SEPARATOR).map((line) => {
        return line.split(TOKEN_SEPARATOR).map((token) => {
          if (do_escape) {
            token = this.escape(token);
          }

          var linkified = false;
          if (do_linkify) {
            var token_matches = [];
            token = linkify.linkify(token, token_matches, {
              truncate_length: 100,
              no_referrer: true,
              add_wbrs: do_word_breaks
            });
            linkified = !_.isEmpty(token_matches);
            // a nice little side-effect here with matches is that it acts as an accumulator
            matches = _.union(matches, token_matches);
          }

          if (do_hex_colors) {
            token = token.replace(/(?:^)(#[\da-fA-F]{6})\b/gm,
              "$1 <span class='hexPreview' style='background-color: $1'>&nbsp;</span>");
          }

          // Add check for emoticonification
          if (!linkified && do_emoticons) {
            token = emoticons.render(token);
          }

          if (!linkified && do_mentions) {
            let name_matches,
              mention_matches,
              guest_matches;

            if (name_regex) {
              name_matches = token.match(name_regex);
              if (name_matches && name_matches.length) {
                let mentionKey = name_matches[0].substr(1);
                let userName = _.escape(utils.get_roster_name(mentionKey)).replace('@', '&#64;');
                let content = `<span class='hc-mention-user hc-mention-me' aria-label='${userName}'>@$1</span>`;
                token = token.replace(name_regex, content);
              }
            }
            if (mention_regex) {
              mention_matches = token.match(mention_regex);
              if (mention_matches && mention_matches[0]) {
                let mentionKey = mention_matches[0].substr(1);
                let userName = _.escape(utils.get_roster_name(mentionKey)).replace('@', '&#64;');
                let content = `<span class='hc-mention-user'><a onClick='HC.Actions.AppActions.openChatByMentionName(this)' aria-label='${userName}' data-mention-name='$1'>@$1</a></span>`;
                token = token.replace(mention_regex, content);
              }
            }
            if (guest_regex) {
              guest_matches = token.match(guest_regex);
              if (guest_matches && guest_matches[0] && !name_matches && !mention_matches) {
                let guestKey = guest_matches[0].substr(1);
                let guestName = _.escape(utils.get_roster_name(guestKey)).replace('@', '&#64;');
                let guest_content = `<span class='hc-mention-user'><a title='${guestName}' data-mention-name='$1'>@$1</a></span>`;
                token = token.replace(guest_regex, guest_content);
              }
            }
          }

          return token;

        }).join(TOKEN_SEPARATOR);
    }).join(LINE_SEPARATOR);

    // Add br's AFTER linkifying - doing it before could result in bad linkify
    if (escape_whitespace) {
      str = str.replace(/\r\n/g, '\n').replace(/[\r\n\u2028]/g, '<br />');
    }

    if (matches && matches.length === 0 && do_word_breaks && !(/[<>]/.test(str))) {
      // Break at commas first (for JSON)
      str = str.replace(/(,)/g, '$1<wbr>');

      // Also break if we have a string of 70 characters w/o spaces (and no wbrs)
      str = str.replace(/([^<>\s&;]{70})/g, '$1<wbr>');
    }

    if (escape_whitespace) {
      if (str.indexOf('  ') !== -1) {
        str = str.replace(/ {2}/g, '&ensp;&ensp;');
      }
      if (str.indexOf('\t') !== -1) {
        str = str.replace(/\t/g, '&ensp;&ensp;');
      }
    }

    return str;
  },

  getNumberOfLines: function(messageBody) {
    let matches = messageBody.match(/<br\s*\/?>/);
    if (!matches || matches.length === 0) {
      matches = messageBody.match(/[\n\r\u2028]+.+/g);
    }
    return (matches ? matches.length + 1 : 1);
  },

  messageShouldBeTruncated: function(messageBody) {
    return utils.getNumberOfLines(messageBody) >= utils.TRUNCATE_LINES || messageBody.length >= utils.TRUNCATE_CHARS;
  },

  fetch: function (val, dflt) {
    return val || dflt;
  },

  formatNumber: function(num) {
    if (typeof num !== 'string' && num.toString) {
      num = num.toString();
    }
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",") || num;
  },

  formatMultilineBlock: function (text) {
    var matches = text.match(/\n.+/gm);
    if (!matches) {
      return text;
    }

    // Add one to numlines because the last line won't have a \n on it
    var numLines = matches.length + 1;
    if (numLines > 1) {
      matches = text.match(/^( {2}|\t)/gm);
      // remove leading whitespace common to all lines
      while (matches && matches.length === (numLines)) {
        text = text.replace(/^( {2}|\t)/gm, '');
        matches = text.match(/^( {2}|\t)/gm);
      }
    }
    return text;
  },

  isFormattedMessage(message){
    return message.format === 'monospace' ||
           message.format === 'code' ||
           message.format === 'quotation';
  },

  isHistoryMessage: function(message) {
    return typeof message.delay !== 'undefined' && !message.id;
  },

  getSenderFromMeta: function (type) {
    var sender;

    switch (type) {
      case 'video':
        sender = 'Video';
        break;
      case 'twitter_status':
      case 'twitter_user':
        sender = 'Twitter';
        break;
      case 'link':
        sender = 'Link';
        break;
      default:
        sender = 'HipChat';
        break;
    }

    return sender;
  },

  getCaretPosition: function (input){
    if ('selectionStart' in input) {
      return input.selectionStart;
    } else if (document.selection) {
      // IE
      input.focus();
      var sel = document.selection.createRange();
      var selLen = document.selection.createRange().text.length;
      sel.moveStart('character', -input.value.length);
      return sel.text.length - selLen;
    }
  },

  getEndSelection: function (input) {
      return input.selectionEnd;
  },

  setCaretPosition: function(input, posn){
    try {
      if (input.createTextRange) {
        var range = input.createTextRange();
        range.move('character', posn);
        range.select();
      }
      else {
        if (!_.isUndefined(input.selectionStart)) {
          input.focus();
          input.setSelectionRange(posn, posn);
          input.focus();
        } else {
          input.focus();
        }
      }
    } catch (e) {/*ignored*/}
  },

  // Mimicks webkit's scrollIntoViewIfNeeded for other browsers
  // https://gist.github.com/hsablonniere/2581101
  scrollIntoViewIfNeeded: function(node, parent, centerIfNeeded) {
    centerIfNeeded = arguments.length === 0 ? true : !!centerIfNeeded;

    if (!node){
      return;
    }

    if ('scrollIntoViewIfNeeded' in node) {
      node.scrollIntoViewIfNeeded(centerIfNeeded);
      return;
    }

    var parentComputedStyle = window.getComputedStyle(parent, null),
      parentBorderTopWidth = parseInt(parentComputedStyle.getPropertyValue('border-top-width'), 10) || 0,
      parentBorderLeftWidth = parseInt(parentComputedStyle.getPropertyValue('border-left-width'), 10) || 0,
      overTop = node.offsetTop - parent.offsetTop < parent.scrollTop,
      overBottom = (node.offsetTop - parent.offsetTop + node.clientHeight - parentBorderTopWidth) > (parent.scrollTop + parent.clientHeight),
      overLeft = node.offsetLeft - parent.offsetLeft < parent.scrollLeft,
      overRight = (node.offsetLeft - parent.offsetLeft + node.clientWidth - parentBorderLeftWidth) > (parent.scrollLeft + parent.clientWidth),
      alignWithTop = overTop && !overBottom;

    if ((overTop || overBottom) && centerIfNeeded) {
      parent.scrollTop = node.offsetTop - parent.offsetTop - parent.clientHeight / 2 - parentBorderTopWidth + node.clientHeight / 2;
    }

    if ((overLeft || overRight) && centerIfNeeded) {
      parent.scrollLeft = node.offsetLeft - parent.offsetLeft - parent.clientWidth / 2 - parentBorderLeftWidth + node.clientWidth / 2;
    }

    if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded) {
      node.scrollIntoView(alignWithTop);
    }
  },

  createSafePredicate(predicate, context) {
    return function () {
      try {
        return predicate.apply(context, arguments);
      } catch (e) {
        return true;
      }
    };
  },

  appendQueryParameter(url, name, value) {
    if (_.startsWith(url, 'data:')) {
      return url;
    }
    let uri = URI.parse(url);
    uri.setParameterValues(name, value);
    return uri.toString();
  },

  setHashFragment(url, value) {
    if (_.startsWith(url, 'data:')) {
      return url;
    }
    let uri = URI.parse(url);
    uri.setFragment(value);
    return uri.toString();
  },

  addConnectApiVersionToUrl(url) {
    return this.appendQueryParameter(url, 'connect_client_api_version', CONNECT_API_VERSION);
  },

  strings: {
    ellipsis: function (content, max_length) {
      var ellipsis = "...",
          new_text;

      if (_.isString(content)) {
        content = content.trim();
        if ((content.length > max_length)) {
          new_text = content.substring(0, max_length - ellipsis.length);
          new_text = new_text.trim();
          new_text = new_text.concat(ellipsis);
        } else {
          new_text = content;
        }
      }
      return new_text || "";
    },

    splitUnit: function(unit) {
      var match = unit.match("(^[0-9\.]+)(.*)$");
      return match ? {
        num: Number(match[1]),
        unit: match[2]
      } : null;
    },

    stripHiddenCharacters: function(str) {
      if (typeof str !== 'string') {
        return str;
      }
      return str.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe-\uffff]/gu, '');
    }
  },

  roster: {
    format_for_select2: function (participants, roster) {
      var roster_jids = _.keys(roster),
          invite_user_jids = _.difference(roster_jids, participants),
          sorted_roster;

      sorted_roster = _.sortBy(_.map(invite_user_jids, function (user_jid) {
          return roster[user_jid];
        }), function (person) {
        return person.name;
      });

      return _.map(sorted_roster, function (person) {
        return {
          id: person.jid,
          text: person.name
        };
      });
    },
    get_non_guest_users(users) {
      return _.transform(users, (acc, value, key) => {
        if (!value.is_guest) {
          acc[key] = value;
        }
        return acc;
      });
    }
  },

  highlight_matches: (text, matches) => {
    var escaped_text = _.escape(text);

    if (_.isString(matches)) {
      matches = _.escape(matches);
      return escaped_text.replace(matches, `<strong>${matches}</strong>`);
    }

    let idx = 0;

    return _.reduce(matches, function (markup, match) {
      match = _.escape(match);
      let match_index = escaped_text.indexOf(match, idx),
          text_between_matches = escaped_text.slice(idx, match_index);
      idx = match_index + match.length;
      return markup.concat(`${text_between_matches}<strong>${match}</strong>`);
    }, '').concat(escaped_text.slice(idx));
  },

  promise: {

    defer: function () {
      var result = {};
      result.promise = new Promise(function (resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
      });
      return result;
    }
  },

  alphaNumeric: function (length) {
    var alphanum = "abcdefghijklmnopqrstuvwxyz0123456789", hash = '';
    _.times(length, () => {hash += alphanum.charAt(Math.floor(Math.random() * alphanum.length));});
    return hash;
  },

  timings: {
    getPerfTiming: function () {

      var perfTimingKeys = [
        //"navigationStart",
        "unloadEventStart",
        "unloadEventEnd",
        "redirectStart",
        "redirectEnd",
        "fetchStart",
        "domainLookupStart",
        "domainLookupEnd",
        "connectStart",
        "connectEnd",
        "secureConnectionStart",
        "requestStart",
        "responseStart",
        "responseEnd",
        "domLoading",
        "domInteractive",
        "domContentLoadedEventStart",
        "domContentLoadedEventEnd",
        "domComplete",
        "loadEventStart",
        "loadEventEnd"
      ];

      if (window.performance && window.performance.timing &&
        typeof window.performance.timing.navigationStart !== "undefined") {
        var metrics = {};
        perfTimingKeys.forEach(function (property) {
          var value = window.performance.timing[property] - window.performance.timing['navigationStart'];
          if (value > 0) {
            metrics[property] = value;
          }
        });
        return metrics;
      }
      return {};
    },

    now: function() {
      if (window.performance) {
        return window.performance.now();
      }
      return Date.now();
    }
  },

  keyCode: {
    LeftArrow: 37,
    UpArrow: 38,
    RightArrow: 39,
    DownArrow: 40,
    Home: 36,
    End: 35,
    Enter: 13,
    Esc: 27,
    Tab: 9,
    PageUp: 33,
    PageDown: 34,
    Delete: 46,
    Backspace: 8,
    Space: 32,
    isSelected(evt) {
      return evt.shiftKey && (evt.keyCode === this.LeftArrow || evt.keyCode === this.RightArrow);
    },
    isModified(evt) {
      return evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey;
    }
  },

  /**
   * Converts to valid html string
   * @param {string} html Html string. For example: <a href='http://example.com'>which never ends!
   * @returns {string} Valid html string For example: <a href="http://example.com">which never ends!</a>
   */
  getFixedHtml: (html) => {
    var el = document.createElement('div');
    el.innerHTML = html;
    return el.innerHTML;
  },

  urls: {
    signOut: function () {
      return `/home?src=chat_exit`;
    },

    guestSignOut: function (key) {
      if (key) {
        return `/g${key}?src=chat_exit`;
      }
    }
  },

  request: {
    getXHR() {
      return new XMLHttpRequest();
    },

    simplePost(url, cb = _.noop, xhr = this.getXHR()) {
      if (_.isString(url) && xhr) {
        xhr.open("POST", url, true);
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            cb(xhr.responseText);
          }
        };
        xhr.send();
      }
    }
  },

  image: {

    load(src, loading_timeout) {

      return new Promise((resolve, reject) => {

        let img = new Image(),
            timeout = null,
            cleanup = () => {
              if (timeout) {
                clearTimeout(timeout);
              }
              img.onload = img.onerror = null;
            };

            img.onload = () => {
              cleanup();
              resolve(img);
            };

            img.onerror = () => {
              cleanup();
              reject();
            };

            timeout = setTimeout(() => {
              cleanup();
              reject();
            }, loading_timeout);

            img.src = src;
      });
    },

    /**
     * Promise wrapper for changing the source of image
     * @param image
     * @param src
     * @param timeout
     * @returns {Promise}
     */
    changeSrc(image, src, timeout = 10000) {
      return new Promise((resolve, reject) => {
        let timeoutId = setTimeout(() => {
          image.onload = image.onerror = null;
          reject();
        }, timeout);

        image.onload = () => {
          image._isLoaded = true;
          clearTimeout(timeoutId);
          resolve(image);
        };
        image.onerror = (...args) => {
          clearTimeout(timeoutId);
          reject(...args);
        };

        image.src = src;
      });
    },

    /**
     * Resize image to appropriate sizes
     * @param <Object> imageObjectURL - object URL for image
     * @param <Integer> maxWidth
     * @param <Integer> maxHeight
     */
    resizeImage(imageObjectURL, maxWidth = 150, maxHeight = 100) {
      return new Promise((resolve, reject) => {
        let canvas = document.createElement('canvas');
        let ratio;

        this.load(imageObjectURL, AppConfig.message_image_loading_timeout).then((img) => {
          let width;
          let height;
          ratio = img.naturalWidth / img.naturalHeight;

          if (ratio >= 1 && img.naturalWidth > maxWidth) {
            height = img.naturalHeight * (maxWidth / img.naturalWidth);
            width = maxWidth;
          } else if (img.naturalHeight > maxHeight) {
            width = img.naturalWidth * (maxHeight / img.naturalHeight);
            height = maxHeight;
          } else {
            width = img.naturalWidth;
            height = img.naturalHeight;
          }

          canvas.width = width;
          canvas.height = height;

          let context = canvas.getContext('2d');
          context.drawImage(img, 0, 0, width, height);

          if(canvas.toBlob) {
            canvas.toBlob(resolve);
          } else if (canvas.msToBlob) {
            let pngImageBlob = canvas.msToBlob();
            resolve(pngImageBlob);
          } else if(canvas.toDataURL && this._checkImageSize(img)) {
            let dataURL = canvas.toDataURL();
            resolve(utils.file.base64_to_blob(dataURL));
          } else {
            reject(new Error('Could not save processed image'));
          }
        });
      });
    },

    /**
     * Checks the size of image to convert it to base64
     * @param {Image} img
     * @returns {boolean}
     * @private
     */
    _checkImageSize(img) {
      return img.naturalHeight <= AppConfig.max_image_size_for_base64 &&
             img.naturalWidth <= AppConfig.max_image_size_for_base64;
    }
  },

  features: {
    reconcileFeatureFlags: function (nativeFlags, featureFlags) {
      let overrides = _.isObject(nativeFlags) ? nativeFlags : {},
          flags = _.isObject(featureFlags) ? featureFlags : {};

      return _.assign({}, flags, overrides);
    },

    btf_capabilities: function (featureFlags) {
      var is_128_or_higher = featureFlags.hasOwnProperty('xmpp_compression');
      var is_137_or_higher = featureFlags.hasOwnProperty('web_client_reconnect_header');

      // These are the other feature flag -> version number mappings that aren't used
      //var is_125_or_higher = featureFlags.hasOwnProperty('gravatar');
      //var is_131_or_higher = featureFlags.hasOwnProperty('web_client_per_room_notifications');
      //var is_134_or_higher = featureFlags.hasOwnProperty('clinky');

      var capabilities = {};
      capabilities.nonce = is_128_or_higher;
      capabilities.oauth = is_137_or_higher;
      return capabilities;
    }
  },

  dom: {
    findParentMatching(element, selector, until = null) {
      let currentElement = element;
      let matchedParent = null;

      while (currentElement) {
        if (selector(currentElement)) {
          matchedParent = currentElement;
          break;
        }

        if ((currentElement.parentElement === document.body) || (until && currentElement.parentElement === until)) {
          break;
        }

        currentElement = currentElement.parentElement;
      }

      return matchedParent;
    },

    matchers: {
      tag(tagName) {
        return e => e.tagName === tagName.toUpperCase();
      }
    }
  },

  xml: {
    toString: function (xml) {
      return (new XMLSerializer()).serializeToString(xml);
    }
  },

  mouseButton: {
    left: 1,
    middle: 2,
    right: 3
  }

};

export default utils;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/utils.js
 **/