var md5 = require('blueimp-md5');

/**
 * Serializes the given list of `users`. The serialization logic is:
 * - Sort users on the uniqueId portion of the JID
 * - Map each user to "<user_id>:<version>"
 * - Join with commas
 *
 * @param {array} users The users to serialize
 * @returns {string} The serialized users string
 */
let serialize = (items) => {
  var list = items.concat()
    .filter((item) => 'id' in item && 'version' in item)
    .sort((a, b) => {
      var aId = Number(a.id),
      bId = Number(b.id);

      if (aId < bId) {
        return -1;
      } else if (bId < aId) {
        return 1;
      }
      return 0;
    })
    .map((item) => `${item.id}:${item.version}`);

  return list.join(',');
};

/**
 * Serializes and hashes the given list of `users`.
 *
 * @param {array} users The users to hash
 * @returns {string} The hashed users string
 */
let create = (items) => {
  if (!Array.isArray(items)) {
    return '';
  }
  return md5(serialize(items));
};

module.exports = {
  create,
  serialize
};


/** WEBPACK FOOTER **
 ** ./src/js/core/common/hash.js
 **/