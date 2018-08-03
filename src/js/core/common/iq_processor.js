import utils from 'helpers/utils';

export default {

  transform(data) {
    let xmlns, transformer;

    // Single IQ: normalize to array
    if (!_.isArray(data.iq)) {
      data.iq = [data.iq];
    }

    data.iq = data.iq.map(iq => {
      xmlns = _.get(iq, 'query.xmlns');
      transformer = this._getTransformer(xmlns);

      return transformer(iq);
    });

    return data;
  },

  _getTransformer(xmlns) {
    let transformer;

    switch (xmlns) {
      case 'http://hipchat.com/protocol/muc#room':
        transformer = this._hipchatRoomEntity;
        break;
      default:
        transformer = _.identity;
        break;
    }

    return transformer;
  },

  _hipchatRoomEntity(iq) {
    // This stanza also comes through for room deletions, which do not
    // have an owner
    if (_.has(iq, 'query.item.owner')) {
      iq.query.item.owner = utils.jid.user_id(iq.query.item.owner);
    }

    return iq;
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/core/common/iq_processor.js
 **/