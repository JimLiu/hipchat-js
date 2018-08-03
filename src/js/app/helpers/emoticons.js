var EMOTICON_FINDER = /\([A-Z0-9]+\)/gim;
import config from 'config/app_config.js';

function getEmoteRegex(shortcut) {
  // Capture space/beginning char in regex to avoid emoticoning links like
  // http://coderwall.com/p/euwpig?i=3&p=1&t=git (& becomes &amp; and matches ;p)
  let regex = '(?:<([A-Z][A-Z0-9]*)\\b.*?(?:\\/>|<\\/\\1>)|(&[a-zA-Z0-9]{2,6};)(?!:-\\()|';
  if (shortcut.indexOf('(') !== 1) {
    regex += '(?:\\s|^)(' + shortcut + ')(?!\\w))';
  } else {
    regex += '(' + shortcut + '))';
  }
  return new RegExp(regex, 'gim');
}

var Emoticons = {
  path_prefix: '/',
  emoticons: {},
  smileys: {},
  asset_base_uri: '',
  web_server: '',
  specials: {
    scumbag: '_scumbagify',
    dealwithit: '_shadesify'
  },

  init: function() {
    this.addSmileys(this.emoticons);
    return this;
  },

  addSmileys: function(smileys) {
    _.each(smileys, (smiley, key) => {
      if (smiley.shortcut === ':') {
        smiley.shortcut = ':\\';
      } else if (smiley.shortcut === '&gt;:-(') {
        // Fix encoded angry face
        smiley.shortcut = '>:-(';
      }
      if (!_.isRegExp(smiley.regex)) {
        smiley.regex = getEmoteRegex(smiley.regex);
      }

      this.smileys[key] = smiley;
    });

    return this.smileys;
  },

  /**
   * Add an word-based emoticon to the list of emoticons to check for
   *
   * @param filename - Name of the image file (the full path is created in the emoticon_text function)
   * @param shortcut - Text used to create the emoticon (e.g. "embarrassed" or "puking" )
   * @param height - Height in pixels of the image
   * @param width - Width in pixels of the image
   **/
  add: function(filename, shortcut, height, width, type) {
    var str = "(" + shortcut + ")";
    // Capture optional space char in regex to be compatible with non paren emoticons
    // We need to check for space with emoticons like ;p to avoid emoticoning links like
    // http://coderwall.com/p/euwpig?i=3&p=1&t=git (& becomes &amp; and matches ;p)
    this.emoticons[str] = {
      file: filename,
      height: height,
      width: width,
      shortcut: '(' + shortcut + ')',
      type: type
    };
  },

  addBulk: function(emoticons, collection = {}) {
    this.emoticons = _.cloneDeep(collection);

    _.each(emoticons, (emoticon) => {
      this.add(emoticon.path, emoticon.shortcut, emoticon.h, emoticon.w, emoticon.type);
    });

    return this.emoticons;
  },

  removeBulk: function(emoticons) {
    let emoticonsMap = {};

    for (let key of [ ...this.getEmoticonsKeys(emoticons) ]) {
      emoticonsMap[key] = true;
    }

    _.forIn(this.emoticons, (emoticon, key) => {
      if(!emoticonsMap[key]) {
        delete this.emoticons[key];
      }
    });

    return this.emoticons;
  },

  getEmoticonsKeys: function *(emoticons) {
    for (let emoticon of emoticons) {
      yield '(' + emoticon.shortcut + ')';
    }
  },

  getEmoticons: function(message) {
    return message.match(EMOTICON_FINDER) || [];
  },

  getEmoticonsInfo(message){
    let usedEmoticons = this.getEmoticons(message);
    return _.filter(this.emoticons, (emoticon) => {
       return usedEmoticons.indexOf(emoticon.shortcut) !== -1;
    });
  },

  /**
   * Replace text emoticons with images
   **/
  render: function(message) {
    let emoticons = this.getEmoticons(message);

    if (emoticons.length) {
      _.each(emoticons, shortcut => {
        let emoticon = this.emoticons[shortcut.toLowerCase()];

        if (emoticon) {
          message = this._replaceWithImage(message, emoticon);
        }
      });
    }

    _.each(this.smileys, smiley => message = this._replaceWithImage(message, smiley));

    return message;
  },

  _replaceWithImage: function(text, emoticon) {
    var src = this._generateSrc(emoticon.file);
    if (!emoticon.regex) {
      emoticon.regex = getEmoteRegex('\\(' + emoticon.shortcut + '\\)');
    }

    // (not a word character)(smiley regex)(not a word character)
    return text.replace(emoticon.regex, (match, p1, p2, p3) => {
      if (p3) {
        return `<img class="remoticon" aria-label="${emoticon.shortcut}" alt="${emoticon.shortcut}" height="${emoticon.height}" width="${emoticon.width}" src="${src}" onerror="if (HC.emoticon_resolution_helper) { HC.emoticon_resolution_helper(this); }" />`;
      }
      return match;
    });
  },

  renderConsole: function(message) {
    try {
      var emoticons = this.getEmoticons(message),
          font = "font-family: Helvetica Neue, Helvetica, Arial; font-size: 14px; font-weight: bold;",
          msg = "%c" + message,
          args = [font];

      emoticons.forEach((emoticon) => {
        let emoticonInfo = this._getEmoticonInfo(emoticon, 1);

        if (_.identity(emoticonInfo)) {
          msg = msg.replace(emoticonInfo.regex, function(match, p1, p2, p3) {if (p3) { return "%c%c"; }});
          args.push("font-size: " + emoticonInfo.height + "px; padding-left: " + (emoticonInfo.width + 5) + "px;" +
            " line-height: 30px; background: url(" + emoticonInfo.src + ") no-repeat 0/auto " + emoticonInfo.height + "px;");
          args.push(font);
        }
      });

      args.unshift(msg);
      console.log.apply(console, args);
    } catch (ignored) {
      console.log(message);
    }
  },

  _getEmoticonInfo: function (shortcut, resolution) {
    var emoticon = this.smileys[shortcut] || this.emoticons[shortcut];
    if (!emoticon) {
      return undefined;
    }
    var fileName = emoticon.file;
    if (!emoticon.regex) {
      emoticon.regex = getEmoteRegex('\\(' + emoticon.shortcut + '\\)');
    }
    return {
      src: this._generateSrc(fileName, resolution),
      regex: emoticon.regex,
      height: parseInt(emoticon.height, 10) > 26 ? 26 : emoticon.height,
      width: parseInt(emoticon.width, 10) > 26 ? 26 : emoticon.width
    };
  },

  _generateSrc(fileName, resolution = 2) {
    if (resolution > 1) {
      let resolutionSuffix = `@${resolution}x`;
      if (fileName.indexOf(resolutionSuffix) === -1){
        fileName = fileName.split('.').join(resolution > 1 ? `${resolutionSuffix}.` : '.');
      }
    }
    return this.path_prefix + '/' + fileName;
  },

  _replaceSpecials: function (node) {
    var emotes = $(node).find('img.remoticon');
    _.forOwn(this.specials, (apply, emote) => {
      for (var i = 0; i < emotes.length; i++) {
        if (emotes[i].getAttribute('src').match(`img/emoticons/${emote}`)
          && emotes[i + 1]
          && emotes[i].nextSibling === emotes[i + 1]
          && emotes[i].getAttribute('src') !== emotes[i + 1].getAttribute('src')) {
          this[apply](emotes[i], emotes[i + 1]);
        }
      }
    });
  },

  _scumbagify: function (hat, scumbag) {
    $(scumbag).on('load', function () {
      var width = $(scumbag).width();
      hat.style.display = 'block';
      hat.parentNode.style.position = 'relative';
      hat.style.position = 'absolute';
      hat.style.top = scumbag.offsetTop - 3 + 'px';
      hat.style.left = scumbag.offsetLeft + width / 2 - 10 + 'px';
    });
  },

  _shadesify: function (shades, coolDude) {
    $(shades).attr({
      src: `https://${this.web_server}/wc/` + config.shades_icon,
      width: 18,
      height: 'auto'
    });
    $(coolDude).on('load', function () {
      var width = $(coolDude).width(),
        height = $(coolDude).height();
      shades.parentNode.style.position = 'relative';
      shades.style.display = 'block';
      shades.style.position = 'absolute';
      shades.style.top = coolDude.offsetTop + height / 2 - 3 + 'px';
      shades.style.left = coolDude.offsetLeft + width / 2 - 9 + 'px';
      $(shades).addClass('shadesify');
    });
  }
};

if (console) {
  console.emote = function (msg) {
    Emoticons.renderConsole.call(Emoticons, msg);
  };
}

module.exports = Emoticons;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/emoticons.js
 **/