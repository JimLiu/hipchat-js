import config from 'config/app_config.js';

var AvatarHelper = {
  defaultAvatarColors: config.default_avatar_colors,

  createAvatarURL: function (url) {
    return `http://${url}`;
  },

  getHash: function (str) {
    var hash = 0, chr;
    for (var idx = 0, max = str.length; idx < max; idx++) {
      chr = str.charCodeAt(idx);
      hash = hash * 31 + chr;
      hash &= hash;
    }
    return hash;
  },

  getGroupAvatarDefaultColor: function (str) {
    var colors = this.defaultAvatarColors,
        colorIndex;

    if (_.isNumber(str)) {
      str = str.toString();
    }

    colorIndex = Math.abs(this.getHash(str) % colors.length);
    return colors[colorIndex];
  },

  getAvatarInitialsFromName(name) {
    let trimmedSpaceName = name.trim();
    let result = this._trimNonAlphanumericChars(trimmedSpaceName).split(/\s+/i).map((el) => {
      let trimmedName = this._trimNonAlphanumericChars(el);
      return trimmedName.charAt(0);
    }).join('').slice(0, 3).toUpperCase();

    return result;
  },

  _trimNonAlphanumericChars(str) {
    let rule = /[=*\/\\+\-_'"`~\(\)\[\]\{\}@]+/i;
    let result = str.replace(rule, '').split('').reverse().join('').replace(rule, '').split('').reverse().join('');

    return result;
  },

  cleanAvatarURL: function (avatarUrl) {
    if (_.isString(avatarUrl) && avatarUrl.indexOf("http://") === -1 && avatarUrl.indexOf("https://") === -1) {
      avatarUrl = this.createAvatarURL(avatarUrl);
    }
    return avatarUrl;
  }
};

module.exports = AvatarHelper;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/avatar_helper.js
 **/