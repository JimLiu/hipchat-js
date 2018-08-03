import AppDispatcher from 'dispatchers/app_dispatcher';
import AppStore from 'stores/application_store';
import PathParamConverters from 'helpers/path_parameter_converters';
import FlagActions from 'actions/flag_actions';
import strings from 'strings/common_strings';

var idToUserConverters = [
  PathParamConverters.get("idToUser"),
  PathParamConverters.get("jidToUser"),
  PathParamConverters.get("halfJidToUser"),
  PathParamConverters.get("mentionNameToUser")];
var idToRoomConverters = [
  PathParamConverters.get("idToRoom"),
  PathParamConverters.get("jidToRoom"),
  PathParamConverters.get("halfJidToRoom"),
  PathParamConverters.get("nameToRoom")];


export default {

  selectRoom(room_id, set_route = false) {
    var room = _.reduce(idToRoomConverters, function(accumulator, idToRoomConverter) {
      if (_.isUndefined(accumulator) && idToRoomConverter.handle(room_id)) {
        return idToRoomConverter.convert(room_id);
      }

      return accumulator;
    }, room);

    if (!_.isUndefined(room)) {

      let activeChatJid = _.get(AppStore.data, 'active_chat');

      if (set_route) {
        AppDispatcher.dispatch('set-route', {jid: room.jid});
      }

      if (!_.get(AppStore.data, `activeRooms["${room.jid}"]`)) {
        AppDispatcher.dispatch('open-room', {jid: room.jid});
      }

      if (activeChatJid !== room.jid) {
        AppDispatcher.dispatch('new-active-chat', {jid: room.jid});
      }
    } else {
      FlagActions.showFlag({
        type: "warning",
        body: strings.room_not_found,
        close: "auto",
        title: "",
        delay: 5000
      });
    }
  },

  selectOTO(user_id, set_route = false) {
    var user = _.reduce(idToUserConverters, function (accumulator, idToUserConverter) {
      if (_.isUndefined(accumulator) && idToUserConverter.handle(user_id)) {
        return idToUserConverter.convert(user_id);
      }

      return accumulator;
    }, user);

    if (!_.isUndefined(user)) {

      let activeChatJid = _.get(AppStore.data, 'active_chat');

      if (set_route) {
        AppDispatcher.dispatch('set-route', {jid: user.jid});
      }

      if (!_.get(AppStore.data, `activeRooms["${user.jid}"]`)) {
        AppDispatcher.dispatch('open-room', {jid: user.jid});
      }

      if (activeChatJid !== user.jid) {
        AppDispatcher.dispatch('new-active-chat', {jid: user.jid});
      }
    } else {
      FlagActions.showFlag({
        type: "warning",
        body: strings.user_not_found,
        close: "auto",
        title: "",
        delay: 3000
      });
    }
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/route_actions.js
 **/