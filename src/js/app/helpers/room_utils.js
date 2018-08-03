import jid_utils from './jid_utils';

var room_utils = {
  get_room_name: function (rooms, room_jid) {
    return (rooms[room_jid]) ? rooms[room_jid].name : "Unknown";
  },
  get_room_id: function (rooms, room_jid) {
    return (rooms[room_jid]) ? rooms[room_jid].id : false;
  },
  detect_chat_type: function (jid) {
    return jid_utils.is_room(jid) ? 'groupchat' : 'chat';
  },
  is_archived: function (room = {}) {
    if (_.isBoolean(room.is_archived)) {
      return room.is_archived;
    }
    return (!!parseInt(room.is_archived, 10) || room.is_archived === '');
  },
  is_guest: function (participant) {
    return _.get(participant, 'is_guest');
  },
  is_admin: function (participant) {
    return _.get(participant, 'is_group_admin');
  }
};

export default room_utils;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/room_utils.js
 **/