var sanitizer = require('sanitizer');

class HtmlSanitizer {
  constructor(tagWhitelist, attributeWhitelist) {
    let whitelistSet = new Set(tagWhitelist);
    let attributeWhitelistSet = new Set(attributeWhitelist);
    let basicPolicy = sanitizer.makeTagPolicy();

    this.customPolicy = function(tagName, attribs) {

      let filteredAttributes = [];
      for (var i = 0; i < attribs.length; i += 2) {
        var attribName = attribs[i];
        var value = attribs[i + 1];

        if (attributeWhitelistSet.has(attribName)) {
          filteredAttributes.push(attribName, value);
        }
      }

      if (whitelistSet.has(tagName)) {
        return basicPolicy(tagName, filteredAttributes);
      }
    };
  }

  sanitize(input) {
    return sanitizer.sanitizeWithPolicy(input, this.customPolicy);
  }
}

module.exports = HtmlSanitizer;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/html_sanitizer.js
 **/