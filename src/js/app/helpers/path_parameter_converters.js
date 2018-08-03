var AppStore = require('stores/application_store'),
    Utils = require('helpers/utils');

class PathParameterConverterRegistry {

  constructor() {
    this.converters = {};
  }

  register(name, predicate, converter) {
    this.converters[name] = {
      handle: predicate,
      convert: converter
    };
  }

  get(name) {
    return this.converters[name];
  }
}

var parameter = {
  isNumber: function(param) {
    return !isNaN(Number(param));
  },

  isHalfJid: function(param) {
    return /\d+_[^@]+/.test(param);
  },

  isMention: function(param) {
    return param.indexOf('@') === 0;
  },

  isAnything: function() {
    return true;
  }
};

var idToRoom = function(param) {
  var paramAsString = param.toString();
  return _.find(AppStore.get('allRooms'), (room) => {
    return _.get(room, 'id', '').toString() === paramAsString;
  });
};

var jidToRoom = function(param) {
  return AppStore.get('allRooms')[param];
};

var halfJidToRoom = function(param) {
  var conferenceServer = AppStore.get('conference_server');
  var jid = `${param}@${conferenceServer}`;
  return AppStore.get('allRooms')[jid];
};

var nameToRoom = function(param) {
  return _.find(AppStore.get('allRooms'), (room) => {
    return room.name === param;
  });
};

var idToUser = function(param) {
  var chatServer = AppStore.get('chat_server');
  var groupId = AppStore.get('group_id');
  var jid = `${groupId}_${param}@${chatServer}`;
  return AppStore.get('roster')[jid];
};

var halfJidToUser = function(param) {
  var chatServer = AppStore.get('chat_server');
  return AppStore.get('roster')[`${param}@${chatServer}`];
};

var jidToUser = function(param) {
  return AppStore.get('roster')[param];
};

var mentionNameToUser = function(param) {
  var mentionName = param.substring(1);
  return _.find(AppStore.get('roster'), (user) => {
    return user.mention_name === mentionName;
  });
};

var pathParameterConverterRegistry = new PathParameterConverterRegistry();

pathParameterConverterRegistry.register("idToUser", parameter.isNumber, idToUser);
pathParameterConverterRegistry.register("jidToUser", Utils.jid.is_private_chat, jidToUser);
pathParameterConverterRegistry.register("halfJidToUser", parameter.isHalfJid, halfJidToUser);
pathParameterConverterRegistry.register("mentionNameToUser", parameter.isMention, mentionNameToUser);

pathParameterConverterRegistry.register("idToRoom", parameter.isNumber, idToRoom);
pathParameterConverterRegistry.register("jidToRoom", Utils.jid.is_room, jidToRoom);
pathParameterConverterRegistry.register("halfJidToRoom", parameter.isHalfJid, halfJidToRoom);
pathParameterConverterRegistry.register("nameToRoom", parameter.isAnything, nameToRoom);

module.exports = pathParameterConverterRegistry;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/path_parameter_converters.js
 **/