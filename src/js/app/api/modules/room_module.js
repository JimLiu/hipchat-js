import DialogActions from "actions/dialog_actions";
import HCAPI from 'api/api';
import PathParamConverters from 'helpers/path_parameter_converters';
import RosterStore from 'stores/roster_store';
import scoped_api from './scoped_api';
import utils from 'helpers/utils';
import logger from 'helpers/logger';

let idToUserConverters = [
  PathParamConverters.get("idToUser"),
  PathParamConverters.get("jidToUser"),
  PathParamConverters.get("mentionNameToUser")];
let idToRoomConverters = [
  PathParamConverters.get("idToRoom"),
  PathParamConverters.get("jidToRoom"),
  PathParamConverters.get("nameToRoom")];

function renderUser(user) {
  return {
    mention_name: user.mention_name,
    id: parseInt(user.id),
    name: user.name,
    presence: user.presence,
    photo_url: user.photo_url,
    is_admin: user.is_admin,
    email: user.email
  };
}

function renderRoom(room) {
  return {
    id: parseInt(room.id),
    name: room.name,
    privacy: room.privacy,
    topic: room.topic
  };
}

function convert(identifier, converters) {
  return _.reduce(converters, function (accumulator, converter) {
    if (_.isUndefined(accumulator) && converter.handle(identifier)) {
      return converter.convert(identifier);
    }
    return accumulator;
  }, undefined);
}

export function create(room_name, room_topic, room_privacy) {
  let room = (typeof room_name === 'string') ? room_name : '';
  let topic = (typeof room_topic === 'string') ? room_topic : '';
  let privacy = (typeof room_privacy === 'string') ? room_privacy : 'public';
  HCAPI.createRoom({
    room_name: room,
    room_topic: topic,
    privacy: privacy
  });
}


export function open({roomId, roomName, userId, userMentionName, message}) {

  let jid;
  let roomIdentifier = roomId || roomName;
  let userIdentifier = userId || userMentionName;

  if (!_.isUndefined(roomIdentifier)) {
    let room = convert(roomIdentifier, idToRoomConverters);

    jid = _.get(room, "jid");

  } else if (!_.isUndefined(userIdentifier)) {
    let user = convert(userIdentifier, idToUserConverters);

    jid = _.get(user, "jid");
  } else {
    logger.warn("[HC-Integrations]", "'roomId', 'roomName', 'userId' or 'userMentionName' parameter must be specified.");
    return;
  }

  if (!_.isUndefined(jid)) {
    HCAPI.openChat({
      jid: jid
    });
  } else {
    logger.warn("[HC-Integrations]", "Failed to open room, room or user was not found.");
  }

  if(typeof message === 'string') {
    HCAPI.appendMessage({
      text: message
    });
  }
}

export function invite(userIds) {
  let users = [];
  userIds = utils.toArray(userIds);
  userIds.forEach((userid) => {
    let user = convert(userid, idToUserConverters);
    let jid = _.get(user, 'jid');
    if (jid) {
      users.push(jid);
    }
  });

  DialogActions.showInviteUsersDialog({
    invite_users: users
  });
}

export const getParticipants = scoped_api('view_room', () => {
  return {
    guests: _.map(RosterStore.getSortedRosterByPresenceAndName(['guests']), renderUser),
    members: _.map(RosterStore.getSortedRosterByPresenceAndName(['members']), renderUser)
  };
});

export const getRoomDetails = scoped_api('view_room', () => {
  let activeChat = HCAPI.getActiveChat();

  return renderRoom(activeChat);
});


/** WEBPACK FOOTER **
 ** ./src/js/app/api/modules/room_module.js
 **/