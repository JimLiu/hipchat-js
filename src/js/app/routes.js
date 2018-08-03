import page from 'page';
import AppDispatcher from 'dispatchers/app_dispatcher';
import AppStore from 'stores/application_store';
import Utils from 'helpers/utils';
import strings from 'strings/chat_panel_strings';
import IntegrationsActions from "actions/integrations_actions";
import RouteActions from "actions/route_actions";

function handleInvalidAction() {
  AppDispatcher.dispatch('show-flag', {
    type: "warning",
    body: strings.integration_does_not_exist,
    close: "auto",
    title: ""
  });
}

function handleInvalidRoom(jid) {
  AppDispatcher.dispatch('show-flag', {
    type: "warning",
    body: strings.room_doesnt_exist,
    close: "auto",
    title: ""
  });
  AppDispatcher.dispatch('close-room', {jid: jid});
}

var routes = {

  /**
   * Supports:
   * /user/<user_id>
   * /room/<user jid>
   * /room/<user half jid -- i.e., 10804_563@... the part before @>
   * /user/<mention_name>
   * */
  '/chat/user/:id': (ctx) => {
    RouteActions.selectOTO(decodeURIComponent(ctx.params.id));
  },

  /**
   * Supports:
   *   /room/<room_id>
   *   /room/<room jid's>
   *   /room/<room half jid's -- i.e., 10804_hc_team@... the part before @>
   *   /room/<display name>
   * */
  '/chat/room/:id': (ctx) => {
      RouteActions.selectRoom(decodeURIComponent(ctx.params.id));
  },

  /**
   * Supports
   * /room/<room_id>/addon/<plugin_key>/module/<module_key>
   *
   */
  '/chat/room/:roomId/addon/:addonKey/module/:moduleKey': (ctx) => {
    let roomId = decodeURIComponent(ctx.params.roomId);
    let addonKey = decodeURIComponent(ctx.params.addonKey);
    let moduleKey = decodeURIComponent(ctx.params.moduleKey);
    RouteActions.selectRoom(roomId);
    if(!IntegrationsActions.open(addonKey, moduleKey)) {
      handleInvalidAction(roomId, addonKey, moduleKey);
    }
  },

  '/chat/lobby': () => {
    AppDispatcher.dispatch('new-active-chat', {jid: 'lobby'});
  },

  '/chat/search': () => {
    AppDispatcher.dispatch('new-active-chat', {jid: 'search'});
  }
};

AppDispatcher.registerOnce({
  'hipchat-client-configured': () => {
    page.start({hashbang: !AppStore.get('html5_routing_enabled'), click: false});
    _.forOwn(routes, (cb, path) => {
      page(path, cb);
    });
  }
});

function reverseRoute(jid, allRooms) {
  let chatType;
  let pathPrefix = '/chat';
  let chatPath;

  if (Utils.jid.is_chat(jid)) {
    chatType = Utils.jid.is_room(jid) ? 'room' : 'user';
    if (chatType === 'room') {
      var room = allRooms[jid];
      if (room) {
        chatPath = `${pathPrefix}/${chatType}/${encodeURIComponent(room.id)}`;
      } else {
        //handle invalid room id and don't set a new route
        handleInvalidRoom(jid);
        return false;
      }
    } else {
      var id = Utils.jid.user_id(jid);
      chatPath = `${pathPrefix}/${chatType}/${encodeURIComponent(id)}`;
    }
  } else {
    chatType = Utils.jid.is_search(jid) ? 'search' : 'lobby';
    chatPath = `${pathPrefix}/${chatType}`;
  }

  return chatPath;
}

export default function () {
  return {
    route: page,
    reverse: reverseRoute
  };
}



/** WEBPACK FOOTER **
 ** ./src/js/app/routes.js
 **/