import tld_list from "helpers/tld_list";

// Create TLD list
let tld_blacklist = ["py", "sh"]; // remove py and sh to avoid linking script filenames
let tlds = _.pullAll(tld_list, tld_blacklist).join("|");

let url_fragments = {
  // url protocol blacklist taken from https://extranet.atlassian.com/display/SECURITY/URI+scheme+whitelisting
  required_url_protocol: "((?:(?!javascript|file|vbscript|view-source|resource|about|chrome|livescript|mocha|data)[a-z][\\w\\-]+:)(?:/{1,3}))",
  optional_url_protocol: "((?:(?!javascript|file|vbscript|view-source|resource|about|chrome|livescript|mocha|data)[a-z][\\w\\-]+:)?(?:/{1,3}))?",
  optional_user_pass_auth: "(?:\\S+(?::\\S*)?@.+)?",
  ip_address_exclusion:
    // IP address exclusion
    // private & local networks
    "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
    "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
    "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})",
  ip_dotted_notation:
    // IP address dotted notation octets
    // excludes loopback network 0.0.0.0
    // excludes reserved space >= 224.0.0.0
    // excludes network & broacast addresses
    // (first & last IP address of each class)
    "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
    "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
    "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))",
  host_name: "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)",
  domain_name: "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)?",
  tld_identifier: "(?:\\.(?:" + tlds + "))\\.?(?:" + tlds + ")?",
  tld_matcher: "(?:\\.(?:[a-zA-Z]{2,12}))\\.?",
  port_number: "(?::\\d{2,5})?",
  resource_path: "(?:(?:,\\-|,\\+|[/?#:'()])\\S*)?"
};

export default {
  simple_word: "^[a-zA-Z0-9]*$",
  email: "[a-z0-9]+(?:[.\\-+][a-z0-9!#$%&'*+=?^_`{|}~\\-]+)*@(?:[a-z0-9](?:[a-z0-9\\-]*[a-z0-9])?[.])+[a-z0-9](?:[a-z0-9\\-]*[a-z0-9])?",
  // Adapted from https://gist.github.com/dperini/729294 - MIT
  url:
    "\\b" +
    "(?:" +
      "(" +
        url_fragments.required_url_protocol +
        url_fragments.optional_user_pass_auth +
        "(?:" +
          "[a-zA-Z\\u00a1-\\uffff0-9_\\-.\(\)]+" +
        ")" +
        url_fragments.port_number +
        url_fragments.resource_path +
      ")|(" +
        url_fragments.optional_url_protocol +
        url_fragments.optional_user_pass_auth +
        "(?:" +
          "localhost" +
          "|" +
          url_fragments.ip_dotted_notation +
          "|" +
          url_fragments.host_name +
          url_fragments.domain_name +
          url_fragments.tld_identifier +
        ")" +
        url_fragments.port_number +
        url_fragments.resource_path +
      ")" +
    ")",
  protocol: url_fragments.required_url_protocol,
  url_end_punctuation: '[\\s`!?()\\[\\]:{};\'".,<>«»“”‘’&]',
  invite_user_url: '^\\s*http(s?):\/\/((\\w+)\.)?hipchat\\.com\/invite\/(\\d+)\/(\\w+)((\\?utm_campaign\\=company_room_link)?)\\s*$'
};



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/regex_helpers.js
 **/