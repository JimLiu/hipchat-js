import Store from 'lib/core/store';
import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import IntegrationsStorage from 'stores/integrations_storage';
import AppConfig from 'config/app_config';
import CurrentUserStore from 'stores/current_user_store';
import ConditionContext from 'helpers/conditions';
import IntegrationHelper from 'helpers/integration_helper';
import PreferencesStore from './preferences_store';
import PreferencesActions from 'actions/preferences_actions';
import PermissionStore from 'stores/permissions_store';
import ClientPrefKeys from 'keys/client_preferences_keys';
import Utils from 'helpers/utils';
import IntegrationViewActions from 'actions/integrations_view_actions';
import logger from 'helpers/logger';
import {event_names, states} from 'keys/integrations_keys';
import version_info from '../../app/version-info.json';

const default_weight = 100;
const default_api_version = 1;
const current_api_version = version_info.connect_api_version;
const minimum_api_version = version_info.minimum_connect_api_version;

function is_supported_version(version = default_api_version) {
  return version >= minimum_api_version && version <= current_api_version;
}

class IntegrationsStore extends Store {
  /*
   * this.data.integrations has the following format:
   * {
   *   global: {
   *     "<sha-1>": {
   *       addon_key: "addon-key-1",
   *       name: "Add-on 1",
   *       ui_extensions: [
   *         {
   *           key: "xyz",
   *           location: "hipchat.message.action",
   *           name: "XYZ",
   *           url: "...",
   *           weight: 100
   *         },
   *         ...
   *       ]
   *     },
   *     "<sha-1>": {
   *       addon_key: "addon-key-2",
   *       ...
   *     }
   *   },
   *   '<room-id>': {
   *     "<sha-1>": {
   *       ...
   *     }
   *     ...
   *   },
   *   ...
   * }
   */

  constructor() {
    super();
    this.storage = new IntegrationsStorage();
    this.states = states;
  }

  reset() {
    super.reset();
    this.storage.reset();
  }

  getDefaults() {
    return {
      integrations: {
      },
      active_rooms: {},
      active_chat: null,
      loading: true,
      enabled: false,
      error: null,
      integration_timestamps: {},
      addon_avatars: {},
      pending_updates: {},
      state: IntegrationsStore.states.INIT,
      unsupported_integrations: [],
      should_show_warning_icon: false
    };
  }

  registerListeners() {
    AppDispatcher.register({
      'updated:config': (data) => {
        var newEnabled = IntegrationHelper.isFeatureEnabled(data);

        if (this.data.state !== IntegrationsStore.states.INIT) {
          if (newEnabled === true && this.data.state === IntegrationsStore.states.DISABLED) {
            this._setState(IntegrationsStore.states.STARTING);
          } else if (newEnabled === false) {
            this._setState(IntegrationsStore.states.DISABLED);
          }
        }

        this.set("enabled", newEnabled);
      },
      // turns an XMPP push into a REST request.
      'integration-update': (data) => {
        if(!this.data.enabled) {
          return;
        }
        this._writeIntegrations(this._processIntegrationChanges(data, true));
      },
      'open-room': (room) => {
        if(!this.data.enabled) {
          return;
        }
        let activeChat = this.get('active_chat');
        if (activeChat && activeChat.jid === room.jid) {
          this._updateIntegrations([activeChat.id]);
        }
      },
      'room-deleted': (room) => {
        var updatedIntegrations = this.get('integrations');
        var updatedTimeStamps = this.get('integration_timestamps');
        var updatedPendingUpdates = this.get('pending_updates');
        delete updatedIntegrations[room.id];
        delete updatedTimeStamps[room.id];
        delete updatedPendingUpdates[room.id];
        this._writeIntegrations({
          integrations: updatedIntegrations,
          timestamps: updatedTimeStamps,
          pending_updates: updatedPendingUpdates
        });
      },
      'groupchat-invite-accepted': (room) => {
        // open-room is called when the user is invited into a room but
        // the active_chat variable is not set because dontSelectRoom is set to true
        if(!this.data.enabled) {
          return;
        }

        var newRoom = this.data.active_rooms[room.jid];
        if (!_.isUndefined(newRoom)) {
          this._updateIntegrations([newRoom.id]);
        }
      },
      'app-state-ready': () => {
        if (this.data.enabled) {
          this._setState(IntegrationsStore.states.STARTING);
        } else {
          this._setState(IntegrationsStore.states.DISABLED);
        }
      },
      'strophe-disconnected': () => {
        if (this.data.enabled) {
          this._setState(IntegrationsStore.states.STOPPED);
        }
      },
      'strophe-connection-failed': () => {
        if (this.data.enabled) {
          this._setState(IntegrationsStore.states.STOPPED);
        }
      },
      'strophe-disconnecting': () => {
        if (this.data.enabled) {
          this._setState(IntegrationsStore.states.STOPPED);
        }
      },
      'DAL:cache-configured': () => {
        if (this.data.enabled) {
          this.storage.ready = true;
          this.storage.getIntegrations().then((integrations) => {
            this.data.integrations = integrations;
          });
        }
      },
      'strophe-reconnected': () => {
        if (this.data.enabled) {
          this._setState(IntegrationsStore.states.STARTING);
        }
      },
      'updated:activeRooms': (rooms) => {
        this._handleActiveRoomsUpdate(rooms);
      },
      'updated:active_chat': (jid) => {
        this._handleSelectRoom(jid);

        let activeChat = this.get('active_chat');

        if (!activeChat) {
          return;
        }

        let activeIntegration = this.getActiveIntegration(activeChat.type),
            activeIntegrationKey = _.get(activeIntegration, "key", null),
            isGroupchat = this._isGroupchat(activeChat.type),
            internalExtensions = isGroupchat ? this.getInternalExtensions() : this.getInternalExtensionsOTO();

        if (activeIntegrationKey) {
          let isInternal = !_.isUndefined(_.find(internalExtensions, integration => integration.full_key === activeIntegrationKey));
          let extension = this.getExtensionByKey(activeIntegrationKey);

          if ( !isInternal && !extension) {
            if (isGroupchat) {
              PreferencesActions.savePreferences({
                [ClientPrefKeys.ACTIVE_GROUPCHAT_INTEGRATION]: null
              });
            } else {
              PreferencesActions.savePreferences({
                [ClientPrefKeys.ACTIVE_CHAT_INTEGRATION]: null
              });
            }
          } else if ( !isInternal && activeChat.id) {
            IntegrationViewActions.fetchSignedUrlConditionally(extension, activeChat.id, {});
          }
        }

        this._fetchPanelContentForInternalGlances(activeIntegration);
      },
      'refresh-integrations': () => {
        this._updateIntegrations(['global', _.get(this.data, 'active_chat.id')]);
      },
      'show-sidebar-integration': (data) => {
        let activeChat = this.get('active_chat');

        if (this._isGroupchat(activeChat.type)) {
          this._setActiveGroupchatIntegration(data);
        } else {
          this._setActiveChatIntegration(data);
        }

        if (data.activeIntegration) {
          this._fetchPanelContentForInternalGlances(data.activeIntegration);
        }
      }
    });
  }

  _syncIntegrations() {
    let roomsToUpdate = _.values(this.data.active_rooms)
      .filter(r => r.type === "groupchat")
      .map(r => r.id);

    this._updateIntegrations(['global'].concat(roomsToUpdate), (err) => {
      if (this.data.state !== IntegrationsStore.states.DISABLED) {
        if (err) {
          this._setState(IntegrationsStore.states.ERROR);
        } else {
          this._setState(IntegrationsStore.states.STARTED);
        }
      }
    });
  }

  _setActiveChatIntegration(data) {
    if (data.activeIntegration) {
      PreferencesActions.savePreferences({
        [ClientPrefKeys.SHOW_CHAT_SIDEBAR]: true,
        [ClientPrefKeys.CHAT_ACTIVE_PANEL]: 'integrations',
        [ClientPrefKeys.ACTIVE_CHAT_INTEGRATION]: data.activeIntegration
      });
    } else {
      PreferencesActions.savePreferences({
        [ClientPrefKeys.ACTIVE_CHAT_INTEGRATION]: null
      });
    }
  }

  _setActiveGroupchatIntegration(data) {
    if (data.activeIntegration) {
      PreferencesActions.savePreferences({
        [ClientPrefKeys.SHOW_GROUPCHAT_SIDEBAR]: true,
        [ClientPrefKeys.GROUPCHAT_ACTIVE_PANEL]: 'integrations',
        [ClientPrefKeys.ACTIVE_GROUPCHAT_INTEGRATION]: data.activeIntegration
      });
    } else {
      PreferencesActions.savePreferences({
        [ClientPrefKeys.ACTIVE_GROUPCHAT_INTEGRATION]: null
      });
    }
  }

  _fetchPanelContentForInternalGlances(activeIntegration) {
    // TODO: At the moment the RosterStore handles all the events for fetching files and links. When we remove the 'dark feature'-flag for the
    // integration panel we should also refactor the RosterStore so that we end up with an IntegrationStore, PeopleStore, FilesStore and
    // LinksStore. But for now we'll need to dispatch this event from here.
    AppDispatcher.dispatch('fetch-panel-content-for-internal-glances', { activeIntegration: activeIntegration });
  }

  _fetchIntegrations(integrations, room_ids, cb) {
    let startTimestamp = Utils.timings.now();
    AppDispatcher.dispatch('API:sync-integrations', {
      integrations: integrations,
      room_ids: room_ids
    }, (resp, xhr) => {
      let duration = Math.floor(Utils.timings.now() - startTimestamp);
      if(!resp || resp.error) {
        clearTimeout(this.loadingTimerId);
        this.set({
          error: resp.error,
          loading: false
        });
        let errorMessage = _.get(resp, 'error.message', xhr.statusText);
        AnalyticsDispatcher.dispatch('analytics-event', {
          name: 'hipchat.client.integrations.sync.error',
          properties: {
            error: errorMessage,
            duration: duration,
            status: xhr.status
          }
        });

        cb.call(this, _.get(resp,'error','Unknown error when synchronising with client'), null);
        return false;
      }

      cb.call(this, null, resp);

      AnalyticsDispatcher.dispatch('analytics-event', {
        name: 'hipchat.client.integrations.sync.success',
        properties: {
          duration: duration
        }
      });
    });
  }

  // removes extensions from a room, given a list of delete nodes
  _removeIntegrations(integrationsInRoom, addon_keys) {
    return _.filter(integrationsInRoom, (integration) => {
      return !(_.includes(addon_keys, integration.addon_key));
    });
  }

  // merge the integrations in a particular context (room or global)
  _mergeIntegrations(integrationsInRoom, addons) {
    return _.merge({}, _.keyBy(integrationsInRoom, 'version'), _.keyBy(addons, 'version'));
  }

  _processIntegrationChanges(data, push_update = false) {
    let integrations = this.get('integrations');
    let integration_timestamps = this.get('integration_timestamps');
    let current_pending_updates = _.clone(this.get('pending_updates'));
    let new_pending_updates = _.get(data, 'pendingUpdates', {});

    let new_timestamp = Date.now();

    // for each room or global, find add-ons to remove and update

    let updateSummary = {};

    _.each(data.changedIntegrations, (addons, roomId) => {
      if (push_update) {
        let keys = _.map(addons, addon => addon.addon_key);
        _.remove(current_pending_updates[roomId], key => _.includes(keys, key));
      } else {
        current_pending_updates[roomId] = _.get(new_pending_updates, roomId, []);
      }

      let [to_remove, to_update] = _.partition(addons, (addon) => { return addon.is_deleted; });
      if (!_.isEmpty(to_remove) || !_.isEmpty(to_update)) {
        updateSummary[roomId] = [to_remove, to_update];
      }

      _.each(to_update, plugin => _.set(integration_timestamps, [roomId, plugin.addon_key], new_timestamp));

      // remove all the updated add-ons by addon_key
      integrations[roomId] = this._removeIntegrations(integrations[roomId], _.map(addons, 'addon_key'));
      // merge the two together.
      integrations[roomId] = this._mergeIntegrations(integrations[roomId], to_update);

      if (!_.isEmpty(to_remove)) {
        let rooms;
        if (roomId === "global") {
          rooms = _.reduce(this.data.active_rooms, (acc, room) => {
            if (this._isGroupchat(room.type)) {
              acc.push({id: room.id});
            }

            return acc;
          }, []);
        } else {
          rooms = [{id: roomId}];
        }

        this._removeIntegrationIfActive(to_remove, rooms);
        AppDispatcher.dispatch(event_names.ON_INTEGRATIONS_REMOVED, {integrations: to_remove, rooms});
      }
    });

    AppDispatcher.dispatch(event_names.ON_INTEGRATIONS_UPDATE_SUMMARY, updateSummary);
    return {integrations: integrations, timestamps: integration_timestamps, pending_updates: current_pending_updates};
  }

  // go get the integrations from the REST API and run the update functions
  _updateIntegrations(room_ids, cb = _.noop) {
    this.data.error = null;
    clearTimeout(this.loadingTimerId);
    this.loadingTimerId = _.delay(() => {
      this.set('loading', true);
    }, AppConfig.integrations.loading_indicator_delay_ms);
    let integrations = this.get('integrations');
    this._fetchIntegrations(integrations, room_ids, (error, data) => {
      if (!error) {
        this._writeIntegrations(this._processIntegrationChanges(data));
      }
      cb(error, data);
    });
  }

  // write integrations to storage.
  _writeIntegrations({integrations, timestamps, pending_updates}) {
    clearTimeout(this.loadingTimerId);

    this.set({
      integrations: integrations,
      pending_updates: pending_updates,
      unsupported_integrations: this._getUnsupportedIntegrationsPerRoom(integrations),
      loading: false,
      integration_timestamps: timestamps,
      addon_avatars: this._getAddonAvatars(integrations, this.data.active_chat)
    });

    this.setShouldShowIntegrationsWarningIcon();
    this.storage.save(integrations);
    AppDispatcher.dispatch('integrations-updated', integrations);
  }

  /**
   * Get the names of unsupported integrations grouped by room
   *
   * @param integrations
   * @returns {*}
   * @private
   */
  _getUnsupportedIntegrationsPerRoom(integrations) {
    let unsupported_integrations = {};
    _.forEach(integrations, (room_integrations, room_name) => {
      let disabledIntegrationKeys = _.reduce(room_integrations, (addon_keys, integration) => {
        if (!is_supported_version(integration.client_api_version)) {
          addon_keys.push(integration.addon_key);
        }
        return addon_keys;
      }, []);

      if (disabledIntegrationKeys.length) {
        unsupported_integrations[room_name] = disabledIntegrationKeys;
      }
    });

    return unsupported_integrations;
  }

  /**
   * Get integrations for the current context (global + groupchat)
   *
   * @returns {Object.<string, object>} integrations
   */
  _getIntegrationsForRooms(room_ids, include_global = false){
    let integrations = this.get('integrations');

    if (include_global) {
      room_ids = room_ids.concat('global');
    }

    return _.pick(integrations, room_ids);
  }

  /**
   * Get integrations for the current context (global + room)
   *
   * @returns {Object.<string, object>} integrations
   */
  _getIntegrationsForContext(){
    let activeChat = this.get('active_chat');
    if (activeChat && activeChat.type === "groupchat") {
      return this._getIntegrationsForRooms([activeChat.id], true);
    }
    return this._getIntegrationsForRooms([]);
  }

  /**
   * Get extensions in a given location
   *
   * @param location
   * @returns {Object[]} list of extensions
   */
  getExtensionsByLocation(location) {
    return this.getExtensionsByLocationAndContext(location, {});
  }

  /**
   * Get extensions in a given location with a given context. The custom context is typically a message
   * or glance metadata. Example context:
   *
   * {
   *   "message": {
   *     "body": "some message",
   *     ...
   *   }
   * }
   *
   * @param location {string} the location, e.g. "hipchat.sidebar.right"
   * @param conditionContext {Object} can contain a 'message' context for conditions.
   * @returns {Object[]} list of extensions
   */
  getExtensionsByLocationAndContext(location, conditionContext) {
    let conditions = this._createConditionContext(conditionContext.message);
    let by_rooms = this._getIntegrationsForContext();
    return this._getExtensions(by_rooms, {}, {location: location}, conditions);
  }

  /**
   * Get extensions of a given type
   *
   * @param type
   * @returns {Object[]} list of extensions
   */
  getExtensionsByType(type) {
    let by_rooms = this._getIntegrationsForContext();
    return this._getExtensions(by_rooms, {}, {type: type});
  }

  getExtensionsByTypeAndRoom(type, room_id) {
    let by_rooms = this._getIntegrationsForRooms([room_id], true);
    return this._getExtensions(by_rooms, {}, {type: type});
  }

  getUnsupportedIntegrationsForRoom() {
    let active_chat = this.get('active_chat');
    if (!active_chat || !this._isGroupchat(active_chat.type)) {
      return [];
    }

    let integrations = this.get('unsupported_integrations'),
        room_ids = ['global', active_chat.id];

    let integrationRooms = _.pick(integrations, room_ids);
    let integrationValues = _.values(integrationRooms);
    return _.flatten(integrationValues);
  }

  setShouldShowIntegrationsWarningIcon() {
    let should_show_warning_icon = false;

    if (this.getUnsupportedIntegrationsForRoom().length > 0) {
      should_show_warning_icon = true;
    }

    if (_.get(this.get('pending_updates'), 'global', []).length > 0 && CurrentUserStore.get('is_admin')) {
      should_show_warning_icon = true;
    }

    let active_chat_id = _.get(this.get('active_chat'), 'id');
    if (_.get(this.get('pending_updates'), active_chat_id, []).length > 0 && PermissionStore.canUpdateRoomIntegrations()) {
      should_show_warning_icon = true;
    }

    this.set({
      'should_show_warning_icon': should_show_warning_icon
    });
  }

  /**
   * Get the extension from the rooms matching the given key
   *
   * @param full_extension_key format => "${addon_key}:${module_key}"
   * @returns {Object|null} extension
   */
  getExtensionByKey(full_extension_key) {
    if (_.isEmpty(full_extension_key)) {
      return null;
    }

    let by_rooms = this._getIntegrationsForContext();
    let [addon_key, key] = IntegrationHelper.split_full_key(full_extension_key);
    var extensions = this._getExtensions(by_rooms, {addon_key}, {key});
    return extensions.length > 0 ? extensions[0] : null;
  }

  /**
   * Get the list of built-in extensions
   *
   * @returns {Object[]} list of extension
   */
  getInternalExtensions() {
    return [AppConfig.people_glance, AppConfig.files_glance, AppConfig.links_glance];
  }

  /**
   * Get the list of built-in extensions for OTO
   *
   * @returns {Object[]} list of extension
   */
  getInternalExtensionsOTO() {
    return [AppConfig.files_glance, AppConfig.links_glance];
  }

  /**
   * Get a built-in extension matching the given key
   *
   * @param full_extension_key format => "${addon_key}:${module_key}"
   * @returns {Object|null} extension
   */
  getInternalExtensionByKey(full_extension_key) {
    return _.find(this.getInternalExtensions(), ext => {
      return ext.full_key === full_extension_key;
    });
  }

  getScopesForAddon(addon_key) {
    let integrationValues = _.mapValues(this._getIntegrationsForContext(), _.toArray);
    let normalizedValues = _.flatten(_.toArray(integrationValues));
    return _.get(_.find(normalizedValues, i => i.addon_key === addon_key), 'scopes', []);
  }

  /**
   * Extract extensions from the provided integrations
   *
   * @param {Object} addon_filter property values to match for addon
   * @param {Object} extension_filter property values to match for extension
   * @param {Object} integrations_by_room
   * @param {Object} conditions optional conditions to evaluate against each extension
   * @returns {Object[]}
   * @private
   */
  _getExtensions(integrations_by_room, addon_filter, extension_filter, conditions = null) {
    let extension_list = [];

    let addon_matches = _.matches(addon_filter);
    let extension_matches = _.matches(extension_filter);

    _.each(integrations_by_room, (addons, roomId) => {
      _.each(addons, (addon) => {

        if (!addon_matches(addon) || !is_supported_version(addon.client_api_version)) {
          return;
        }
        _.each(addon.ui_extensions, (ui_extension) => {
          if(extension_matches(ui_extension) && (!conditions || conditions.evaluate(ui_extension.conditions))){
            extension_list.push(_.extend({
              addon_key: addon.addon_key,
              full_key: IntegrationHelper.to_full_key(addon.addon_key, ui_extension.key),
              addon_version: addon.version,
              addon_timestamp: this._getTimestamp(roomId, addon.addon_key)
            }, ui_extension));
          }
        });
      });
    });

    return this._sort_extensions(extension_list);
  }

  _sort_extensions(extension_list) {
    let paired_extension_list = _.toPairs(_.groupBy(extension_list, (extension) => extension.addon_key)),
      sorted_extension_list = _.sortBy(paired_extension_list, ([key,extension]) => key);
    return _.flatten(_.map(sorted_extension_list, ([key,extensions]) => _.sortBy(extensions, extension => extension.weight ? -extension.weight : -default_weight)));
  }

  _createConditionContext(message) {
    return new ConditionContext()
      .withRoom(this.get('active_chat'))
      .withUser(CurrentUserStore.getAll())
      .withMessage(message);
  }

  _handleSelectRoom(jid) {
    if (!jid) {
      return;
    }

    let active_chat = this.data.active_rooms[jid];
    if (_.isObject(active_chat)) {
      this.set({
        'active_chat': active_chat,
        'addon_avatars': this._getAddonAvatars(this.data.integrations, active_chat)
      });
      this.setShouldShowIntegrationsWarningIcon();
    }
  }

  _handleActiveRoomsUpdate(rooms) {
    var deleted = _.difference(_.keys(this.data.active_rooms), _.keys(rooms));
    if (deleted.length) {
      var removedRooms = [];
      for (var item in deleted) {
        let jid = deleted[item],
            deletedRoom = this.data.active_rooms[jid];
        if (deletedRoom.type === "groupchat" && deletedRoom.id) {
          removedRooms.push({id: deletedRoom.id});
        }
      }

      if (removedRooms.length) {
        AppDispatcher.dispatch(event_names.REMOVE_DATA_FOR_ROOMS, { rooms: removedRooms });
      }

      this.data.active_rooms = _.omit(this.data.active_rooms, deleted);
    } else {
      this.data.active_rooms = _.merge(this.data.active_rooms, rooms);
    }
  }

  _getTimestamp(roomId, addonKey) {
    // If we don't have a timestamp, then add one
    let timestamp = _.get(this.data.integration_timestamps, [roomId, addonKey], null);

    if (timestamp === null) {
      timestamp = Date.now();
      _.set(this.data.integration_timestamps, [roomId, addonKey], timestamp);
    }

    return timestamp;
  }

  _getAddonAvatars(integrations, active_chat) {
    let globalIntegrations = _.get(integrations, "global", []);
    let roomIntegrations = _.get(integrations, _.get(active_chat, "id", ""), []);
    let globalIntegrationValues = _.values(globalIntegrations);
    let roomIntegrationValues = _.values(roomIntegrations);

    let integrationWithAvatars = _.filter([].concat(globalIntegrationValues, roomIntegrationValues), i => i.avatar);
    let addonPairs = _.map(integrationWithAvatars, i => [i.addon_key, i.avatar]);
    return _.fromPairs(addonPairs);
  }

  _isGroupchat(chatType) {
    return chatType === 'groupchat';
  }

  getActiveIntegration(chatType) {
    if(this._isGroupchat(chatType)) {
      return PreferencesStore.getActiveGroupchatIntegration();
    }

    return PreferencesStore.getActiveChatIntegration();
  }

  _removeIntegrationIfActive(integrations, rooms) {
    let activeChat = this.get('active_chat');
    if (activeChat && _.find(rooms, {'id': activeChat.id})) {
      let activeGroupChatIntegration = PreferencesStore.getActiveGroupchatIntegration();
      if (activeGroupChatIntegration) {
        let [addon_key] = IntegrationHelper.split_full_key(activeGroupChatIntegration.key);
        if (_.find(integrations, {addon_key})) {
          this._setActiveGroupchatIntegration({});
        }
      }
    }
  }

  _setState(newState) {
    if (this.data.state === newState) {
      return;
    }

    logger.debug('[HC-Integrations]', `State transition from ${this.data.state} -> ${newState}`);
    this.set('state', newState);

    if (newState === IntegrationsStore.states.STARTING) {
      this._syncIntegrations();
    }
  }

  getUniqueIntegrationsForContext() {
    let integrations = this._getIntegrationsForContext();

    let all_integrations = _.map(integrations, (context_integrations, context) => {
      return _.map(context_integrations, integration => ({
        context: context,
        addon_key: integration.addon_key,
        name: integration.name,
        icon: _.get(integration, 'icon.url')
      }));
    });

    let flattened_integrations = _.flatten(_.map(all_integrations, _.values));
    return _.uniqBy(flattened_integrations, i => i.addon_key);
  }

  getIntegrationStatusesForContext() {
    let integrations = this.getUniqueIntegrationsForContext();
    let unsupported_integrations = this.getUnsupportedIntegrationsForRoom();

    let pending_updates = _.filter(integrations, i => {
      let pending_update_keys = _.get(this.get('pending_updates'), i.context, []);
      return _.includes(pending_update_keys, i.addon_key);
    });


    let [pending_global_updates, pending_room_updates] = _.partition(pending_updates, i => i.context === "global");
    let [disabled, installed] = _.partition(integrations, i => _.includes(unsupported_integrations, i.addon_key));

    return {
      pending_global: pending_global_updates,
      pending_room: pending_room_updates,
      disabled: disabled,
      installed: installed
    };
  }
}

IntegrationsStore.states = Object.freeze({
  INIT: 'init',
  STARTING: 'starting',
  STARTED: 'started',
  STOPPED: 'stopped',

  DISABLED: 'disabled',
  ERROR: 'error'
});

export default new IntegrationsStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/integrations_store.js
 **/