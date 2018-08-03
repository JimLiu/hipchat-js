import CurrentUserStore from 'stores/current_user_store';
import Store from "lib/core/store";
import AppDispatcher from "dispatchers/app_dispatcher";
import HtmlSanitizer from 'helpers/html_sanitizer';
import IntegrationsHelper from 'helpers/integration_helper';
import IntegrationsStore from 'stores/integrations_store';
import ConditionContext from 'helpers/conditions';
import GlanceHelper from 'helpers/glance_helper';
import logger from 'helpers/logger';
import {GLANCE_UPDATE} from "api/api_integration_events";

import {
  event_names as integrations_event_names,
  states as integration_states,
  glance_room_states,
  extension_types
} from 'keys/integrations_keys';

let glanceHtmlSanitizer = new HtmlSanitizer([
  "b", "strong", "em", "i"
]);


class GlancesMetadataStore extends Store {

  constructor() {
    super();
  }

  getDefaults() {
    return {
      active_rooms: {},
      visible_glances: [],
      dynamic_glances: [],
      room_state: {},
      integrations_state: integration_states.INIT,
      active_chat: ""
    };
  }

  registerListeners() {
    AppDispatcher.register({
      "fetch-glance-metadata": (room_id, glance, reload_errors = false) => {
        this._fetchGlanceMetadata(room_id, glance, reload_errors);
      },
      "glance-metadata-loading": (room_id, glance_key, data) => {
        this._setGlanceLoading(room_id, glance_key);
        this._updateGlances();
      },
      "glance-metadata-fetched": (room_id, glance_key, data) => {
        let sanitizedData = this._sanitizeMetadata(data);
        this._setRoomMetadata(room_id, glance_key, sanitizedData);
        this._updateGlances();
      },
      "glances-finished-loading-for-room": (room_id, success) => {
        this._finishLoadingForRoom(room_id, success);
      },
      "glance-metadata-pushed": (push_data) => {
        _.each(push_data, (data) => {
          let glance_key = IntegrationsHelper.to_full_key(data.addon_key, data.key);
          let sanitizedContent = this._sanitizeMetadata(data.content);

          AppDispatcher.dispatch("integration-iframe-event",
            GLANCE_UPDATE, {
              addon_key: data.addon_key
            }, {
              addon_key: data.addon_key,
              module_key: data.key,
              metadata: _.get(data, "content.metadata", {})
          });

          if (data.room_id) {
            this._setRoomMetadata(data.room_id, glance_key, sanitizedContent);
          } else {
            this._setGlobalMetadata(glance_key, sanitizedContent);
          }
        });
        this._updateGlances();
      },
      "integrations-updated": (integrations) => {
        this._updateGlances();
      },
      "updated:activeRooms": (rooms) => {
        this._handleActiveRoomsUpdate(rooms);
      },
      "after:updated:active_chat": (jid) => {
        // We're listening to after:updated:active_chat instead of updated:active_chat so we're sure that
        // integrations_store is aware of the current room
        // TODO: change update glance and integrationstore to take an active room parameter when needed
        this._handleActiveChatUpdate(jid);
      }
    });

    AppDispatcher.register(integrations_event_names.REMOVE_DATA_FOR_ROOMS, (data) => {
      this._cleanMetadataForRooms(data.rooms);
    });

    AppDispatcher.register(integrations_event_names.ON_INTEGRATIONS_REMOVED, (data) => {
      _.each(data.integrations, (integration) => {
        this._handleUninstalledIntegration(integration, data.rooms);
      });
    });

    IntegrationsStore.on('change:state', (state, old_state) => {
      this.set('integrations_state', state);

      if (state === integration_states.STARTED || state === integration_states.ERROR) {
        this._handleActiveChatUpdate(this.data.active_chat);
      } else if (state === integration_states.STOPPED) {
        this.setDirty();
      }
    });
  }

  onGlanceMetadataChange(room_id, glance_key, callback) {
    let key = this.fullKey(room_id, glance_key);
    this.on(`change:${key}`, callback);
  }

  offGlanceMetadataChange(room_id, glance_key, callback) {
    let key = this.fullKey(room_id, glance_key);
    this.off(`change:${key}`, callback);
  }

  getValidCachedMetadata(room_id, glance_key) {
    var cachedMetadata = this.get(this.fullKey(room_id, glance_key));
    if (!_.isUndefined(cachedMetadata) && _.isEmpty(cachedMetadata.error)) {
      return cachedMetadata;
    }
    return undefined;
  }

  getCachedMetadata(room_id, glance_key) {
    let cachedMetadata = this.get(this.fullKey(room_id, glance_key));
    if(_.isUndefined(cachedMetadata)) {
      return {};
    }

    if (!cachedMetadata.error){
      cachedMetadata.error = null;
    }

    return cachedMetadata;
  }


  fullKey(room_id, glance_key) {
    return `${room_id}:${glance_key}`;
  }

  setDirty() {
    this.set('room_state', _.mapValues(this.data.room_state, _.constant(glance_room_states.DIRTY)));
  }

  shouldFetch(room_id, glance_key) {
    let cachedMetadata = this.getCachedMetadata(room_id, glance_key);
    return _.isEmpty(cachedMetadata) || (cachedMetadata.dirty === true && !cachedMetadata.loading);
  }

  _setGlanceLoading(room_id, glance_key) {
    let fullKey = this.fullKey(room_id, glance_key);
    let cachedMetadata = this.getCachedMetadata(room_id, glance_key);
    if(_.isUndefined((cachedMetadata))) {
      cachedMetadata = {};
    }
    cachedMetadata.error = null;
    cachedMetadata.loading = true;
    this.set(fullKey, cachedMetadata);
  }

  _updateGlances() {
    let allGlances = IntegrationsStore.getExtensionsByType(extension_types.GLANCE);
    let visibleGlances = allGlances.filter(g => this._shouldDisplayGlance(g));
    let dynamicGlances = allGlances.filter(g => !_.isUndefined(g.query_url));
    this.set({
      visible_glances: visibleGlances,
      dynamic_glances: dynamicGlances
    });
  }

  _shouldDisplayGlance(glance) {

    let active_chat = IntegrationsStore.get('active_chat');
    if(_.isEmpty(active_chat)) {
      return false;
    }

    let glance_data = this.getCachedMetadata(active_chat.id, glance.full_key);

    if(_.isEmpty(glance.conditions) || !_.isEmpty(glance_data.error)) {
      return true;
    }

    let current_user = CurrentUserStore.getAll();
    let context = new ConditionContext()
      .withRoom(active_chat)
      .withUser(current_user);

    if(context.canEvaluate(glance.conditions)) {
      return context.evaluate(glance.conditions);
    }

    //If glance is loading, and has conditions, we might want to display it later
    if(_.isUndefined(glance_data) || glance_data.loading) {
      return false;
    }

    return context.withGlanceData(glance_data).evaluate(glance.conditions);
  }

  _setRoomMetadata(room_id, glance_key, data) {
    this.set(this.fullKey(room_id, glance_key), _.merge({loading: false, dirty: false},
      data));
  }


  _setGlobalMetadata(glance_key, data) {
    _.each(this._getAllActiveRoomIds(), (room_id) => {
      this._setRoomMetadata(room_id, glance_key, data);
    });
  }

  _sanitizeMetadata(data) {
    data.label = this._sanitizeMetadataContent(data.label);
    data.status = this._sanitizeMetadataContent(data.status);

    return data;
  }

  _sanitizeMetadataContent(content) {
    if (!_.isObject(content)) {
      return {};
    }

    switch (content.type) {
      case "html":
        content.type = "safe_html";
        content.value = glanceHtmlSanitizer.sanitize(content.value);
        break;
      default:
        break;
    }

    return content;
  }

  _handleActiveRoomsUpdate(rooms) {
    let jids_to_room_ids = {};
    for (var item in rooms) {
      if (rooms[item].type === "groupchat" && rooms[item].id) {
        jids_to_room_ids[item] = rooms[item].id;
      }
    }

    this.set({
      "active_rooms": jids_to_room_ids
    });
  }

  _getMetadataKeysMatching(prefix) {
    return _.filter(_.keys(this.data), (key) => _.startsWith(key, prefix));
  }

  _clearMetadataForContext(rooms, prefix) {
    let metadataKeys = _.map(rooms, (room) => {
        let prefixedRoom = prefix(room);
        return this._getMetadataKeysMatching(prefixedRoom);
    });

    let flattenKeys = _.flatten(metadataKeys);
    flattenKeys.forEach(key => this.unset(key));
  }

  _cleanMetadataForRooms(rooms) {
    this._clearMetadataForContext(rooms, room => `${room.id}:` );
    let ids = _.map(rooms, "id");
    this.set("room_state", _.pickBy(this.data.room_state, (v,id) => {
      if (_.includes(ids, id)) {
        logger.debug('[HC-Integrations]', `glances:${id} state transition from ${(_.get(this.data.room_state, id, glance_room_states.INIT))} -> unloaded`);
        return false;
      }
    }));
  }

  _handleUninstalledIntegration(integration, rooms) {
    this._clearMetadataForContext(rooms, room => `${room.id}:${integration.addon_key}:` );
  }

  _handleActiveChatUpdate(jid) {
    let activeRoom = this.data.active_rooms[jid];

    if (activeRoom) {
      var state = this._getRoomState(activeRoom);

      if (state === glance_room_states.INIT || state === glance_room_states.DIRTY) {
        this._setRoomState(activeRoom, glance_room_states.LOADING);
      }
    }
    this.set('active_chat', jid);
    this._updateGlances();
  }

  _getAllActiveRoomIds() {
    return _.values(this.data.active_rooms);
  }

  _getRoomState(id) {
    if (this.data.integrations_state === integration_states.STARTED || this.data.integrations_state === integration_states.ERROR) {
      return _.get(this.data.room_state, id, glance_room_states.INIT);
    }
    return glance_room_states.WAITING;
  }

  _setRoomState(id, state) {
    var current_state = _.get(this.data.room_state, id, glance_room_states.INIT);

    if (current_state !== state) {
      if (state === glance_room_states.LOADING) {
        //Fetch glance metadata

        GlanceHelper.fetchGlanceMetadataForRoom(id);
      }

      let updated_states = _.clone(this.data.room_state);
      updated_states[id] = state;
      logger.debug('[HC-Integrations]', `glances:${id} state transition from ${current_state} -> ${state}`);
      this.set({room_state: updated_states});
    }
  }

  _fetchGlanceMetadata(room_id, glance, reload_errors) {
    var metadata = this.get(this.fullKey(room_id, glance.full_key));
    let shouldReload = _.get(metadata, 'dirty', false);
    if (_.isUndefined(metadata) && glance_room_states.LOADED === this._getRoomState(room_id)) {
      logger.debug('[HC-Integrations]', `Fetching single glance as no metadata exists and room was already loaded - glances:${room_id}:${glance.full_key}`);
      shouldReload = true;
    }

    if (_.get(metadata, 'error', false) && reload_errors) {
      logger.debug('[HC-Integrations]', `Fetching single glance as currently in error state and reload was triggered - glances:${room_id}:${glance.full_key}`);
      shouldReload = true;
    }

    if (shouldReload) {
      this._setGlanceLoading(room_id, glance.full_key);
      GlanceHelper.fetchGlanceRemoteMetadata(room_id, glance);
    }
  }

  _finishLoadingForRoom(room_id, success) {
    if (!success) {
      // Mark as failed
      IntegrationsStore.getExtensionsByTypeAndRoom(extension_types.GLANCE, room_id)
        .forEach(e => {
          if (e.query_url) {
            this.set(this.fullKey(room_id, e.full_key), {
              loading: false,
              error: "Failed to load glance"
            });
          }
        });

        this._updateGlances();
    }

    this._setRoomState(room_id, glance_room_states.LOADED);
  }
}

export default new GlancesMetadataStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/glances_metadata_store.js
 **/