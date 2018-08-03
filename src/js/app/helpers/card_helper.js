var logger = require('helpers/logger');

var validTypes = new Set(['link', 'media', 'file', 'image', 'application']);

var CardHelper = {

  cardsEnabled: function(feature_flags) {
    return feature_flags && feature_flags.web_client_cards_enabled;
  },

  isValidStyle: function(card) {
    return card && validTypes.has(card.style);
  },

  isLink: function (card) {
    return card && card.style === 'link';
  },

  isMedia: function (card) {
    return card && card.style === 'media';
  },

  isFile: function (card) {
    return card && card.style === 'file';
  },

  isImage: function (card) {
    return card && card.style === 'image';
  },

  isApplication: function (card) {
    return card && card.style === 'application';
  },

  isValidCard: function(card) {

    if(!card) {
      return false;
    }

    if (!CardHelper.isValidStyle(card)) {
      return false;
    }

    if (card.id === undefined) {
      logger.warn('Card does not have an id');
      return false;
    }

    if (CardHelper.isLink(card)) {

      if (card.title === undefined) {
        logger.warn('Link Card needs a title');
        return false;
      }

      if (card.description === undefined) {
        logger.warn('Link Cards needs a description');
        return false;
      }
    }

    if (CardHelper.isImage(card)) {
      if (card.url === undefined) {
        logger.warn('Image Card does not have a url');
        return false;
      }
    }

    return true;
  }

};

module.exports = CardHelper;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/card_helper.js
 **/