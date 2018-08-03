/*global ENV*/
import AnalyticsEvents from "./analytics_events";
import AnalyticsEventKeys from "keys/analytics_event_keys";
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import AppDispatcher from 'dispatchers/app_dispatcher';
import AppConfig from 'config/app_config';
import ConfigStore from 'stores/configuration_store';
import utils from 'helpers/utils';
import DAL from 'core/dal';
import logger from 'helpers/logger';
require('vendor/herment.2.5.7.min.js');

class Analytics {
  constructor(initState, clientIdentifier, herment = window['herment-gas-client'], metrics = window['app-metrics'], performance = window['performance']) {
    this.setupVariables(initState, clientIdentifier, performance);
    this.bindCustomAnalyticEvents();
    this.startHerment(initState, clientIdentifier, herment);
    this.setupMetrics(metrics);
    // now that we have the ability to push events onto the queue, let's fire off any queued analytics
    this.handlePreloaderAnalytics();
    this.handleAnalyticsLaunched();
    this.registerListeners();
  }

  registerListeners() {
    // AppDispatcher Events
    AppDispatcher.registerOnce({
      'app-state-ready': () => {
        this.handleAppStateReady();
      },
      'DAL:cache-configured': () => {
        // If we starting in the lobby, we should not send the 'launch-to-chat' event
        DAL.Cache.get(DAL.Cache.Keys.CLIENT_PREFERENCES).then((prefs) => {
          this.shouldSendLaunchToChat = this.shouldSendLaunchToChatComplete = utils.jid.is_chat(_.get(prefs, 'chatToFocus'));
        });
      }
    });

    // AnalyticsDispatcher Events
    AnalyticsDispatcher.registerOnce({
      'analytics-client-ready': () => {
        this.handleAnalyticsClientReady();
      },
      'analytics-rooms-loaded': () => {
        this.handleAnalyticsRoomLoaded();
      },
      'analytics-roster-loaded': () => {
        this.handleAnalyticsRosterLoaded();
      },
      'analytics-emoticons-loaded': () => {
        this.handleAnalyticsEmoticonLoaded();
      }
    });
    AnalyticsDispatcher.register({
      'analytics-hc-client-start': () => {
        this.handleClientStart();
      },
      'analytics-hc-client-initial-connection': () => {
        this.handleInitialConnection();
      },
      'analytics-hc-client-reconnection-start': () => {
        this.handleReconnectionStart();
      },
      'analytics-hc-client-reconnection-success': () => {
        this.handleReconnectionSuccess();
      },
      'analytics-initial-presence-response-received': () => {
        this.handlePresenceResponse();
      },
      'analytics-start-iq-response-received': () => {
        this.handleStartupIqResponse();
      },
      'analytics-initial-auth-start': () => {
        this.handleAuthStart();
      },
      'analytics-initial-auth-done': () => {
        this.handleAuthDone();
      },
      'analytics-on-dom-ready': () => {
        this.handleDomReady();
      },
      'analytics-hc-init': () => {
        this.handleAppInit();
      },
      'analytics-chat-mount': (data) => {
        this.handleChatMountEvent(data);
      },
      'analytics-open-room': (data) => {
        this.handleOpenedRoom(data);
      },
      'analytics-request-history': (data) => {
        this.handleHistoryRequest(data);
      },
      'analytics-history-loaded': (data) => {
        this.handleHistoryResponse(data);
      },
      'analytics-roster-mount': (data) => {
        this.handleRosterMount(data);
      },
      'analytics-files-mount': (data) => {
        this.handleFilesMount(data);
      },
      'analytics-select-room': (data) => {
        this.handleLobbyOpen(data);
      },
      'analytics-lobby-mount': (data) => {
        this.handleLobbyMount(data);
      },
      'analytics-new-active-chat': (data) => {
        if(utils.jid.is_chat(data.jid)) {
          this.spawnCompositeEvent(AnalyticsEventKeys.CHAT_SENDABLE, data);
          this.spawnCompositeEvent(AnalyticsEventKeys.CHAT_IS_COMPLETE, data);
        }
      },
      'performance-timing:analytics-launch-to-chat': (data) => {
        this.handleLaunchToChat(data);
      },
      'performance-timing:analytics-launch-to-chat-complete': (data) => {
        this.handleLaunchToChatComplete(data);
      }
    });
  }

  registerAppStateReadyAnalytics() {
    AnalyticsDispatcher.registerOnce({
      'performance-timing:analytics-launch-to-active-chat-list': (data) => {
        this.handleLaunchToActiveChatList(data);
      }
    });
  }

  setupVariables(initState, clientIdentifier, performance) {
    this.eventQueue = [];
    this.userAgent = utils.browser.userAgent();
    this.performance = performance;
    this.slug = this.getSlug(clientIdentifier); // client identifier sent with events
    this.baseEvent = this.getBaseEvent(initState.group_id, initState.user_id, this.slug, initState.is_admin, clientIdentifier.client_version_id); // setup base event for analytics
    this.isGuest = this.getIsGuest(); // need to account for guest access for some of our analytics
    this.appLaunchTime = window.hc_client_launch_time; // global variable set in HTML - earliest time in the app launch sequence
    this.browserMetricsBaseEvent = this.getBrowserMetricsBaseEvent(initState.is_admin, this.slug);
    this.requiredClientUpToDateFetchTimes = this.getRequiredClientFetchTimesObject(this.isGuest); // stores the times for each expected action that's necessary to get the client "up-to-date" on a load
    // this will hold the composite event objects that have a longer lifespan than the fire-and-forget events.
    // Examples include "navigate start --> able to send message" and "navigate start --> chat is fully initialized"
    this.compositeEventQueue = {};
    // Will override these with proper values in DAL:cache-configured handler above
    this.shouldSendLaunchToChat = this.shouldSendLaunchToChatComplete = true;
    this.deleteWindowLaunchTime();
  }

  bindCustomAnalyticEvents(events = AnalyticsEvents.events) {
    _.forOwn(events, (handler, hcWebEvent) => {
      if (_.isString(handler)) {
        let eventName = handler;
        handler = function() {
          return {
            name: eventName
          };
        };
      }
      AnalyticsDispatcher.register(hcWebEvent, (...args) => this.sendEvents(handler.apply(this, args)));
    });
  }

  /**
   * Pushes the events onto the Herment stack.
   * @param result
   */
  sendEvents(result) {
    if (result) {
      let events = utils.toArray(result);
      _.each(events, (event) => {
        this.addToEventQueue(this.makeEvent(event));
      });
    }
  }

  startHerment(initState, clientIdentifier, herment = window['herment-gas-client']) {
    let options = this.getHermentOptions(initState.group_id, initState.user_id, clientIdentifier.client_version_id);
    herment(options).start();
    logger.type('analytics').withFilter().alwaysExpanded().log('Herment started with options: ', options);
  }

  setupMetrics(metrics = window['app-metrics']) {
    // App metrics configuration specifics which is in line with the custom implementation of herment here
    this.metrics = metrics({publish: this.customPublish.bind(this), unfold: true});
  }

  customPublish(key, data) {
    let event = this.makeEvent({name: key, properties: data});
    this.addToEventQueue(event);
  }

  customBrowserMetricsEvent(properties) {

    if ('probes' in properties && properties.probes <= 0) {
      logger.type('analytics').withFilter().alwaysExpanded().log('Probes property is invalid. Event was skipped: ', properties);
      return;
    }

    let props = _.assign(properties, {
          "sid": ConfigStore.getSID()
        }),
        fullEvent = _.assign(_.clone(this.browserMetricsBaseEvent), {
          "properties": props
        }),
        event = this.makeEvent(fullEvent);
    this.addToEventQueue(event);
  }

  handleRequiredClientUpToDateFetchTime(name) {
    let timeSinceLaunch = this.getTimeSinceAppLaunch();
    this.requiredClientUpToDateFetchTimes[name] = timeSinceLaunch;
    if (_.every(this.requiredClientUpToDateFetchTimes)) {
      let eventData = {
            name: AnalyticsEventKeys.CLIENT_CURRENT,
            properties: {
              time_since_launch: timeSinceLaunch,
              is_guest: this.isGuest
            }
          },
          event = this.makeEvent(eventData);
      this.addToEventQueue(event);
      this.handleInitialDataFetched();
    }
  }

  handlePreloaderAnalytics() {
    if(window.preloaderEvents) {
      // Register to be notified when the preloader completes
      window.preloaderEvents.onComplete((eventQueue) => {
        // For any that exist - pull them in, make them full events
        _.each(eventQueue, (event) => {
          this.addToEventQueue(this.makeEvent(event));
        });
      });
    }
  }

  handleAnalyticsLaunched() {
    let event = this.makeEvent({name: AnalyticsEventKeys.CLIENT_LAUNCH});
    this.addToEventQueue(event);
  }

  handleAnalyticsRoomLoaded() {
    this.handleRequiredClientUpToDateFetchTime("rooms");
    this.metrics.stop({key: AnalyticsEventKeys.INITIAL_ROOMS, id: 'app', size: 0, props: {method: "bosh"}});
  }

  handleAnalyticsRosterLoaded() {
    this.handleRequiredClientUpToDateFetchTime("roster");
    this.metrics.stop({key: AnalyticsEventKeys.INITIAL_ROSTER, id: 'app', size: 0, props: {method: "bosh"}});
  }

  handleAnalyticsEmoticonLoaded() {
    this.handleRequiredClientUpToDateFetchTime("emoticons");
    this.metrics.stop({key: AnalyticsEventKeys.INITIAL_EMOTICONS, id: 'app', size: 0, props: {method: "bosh"}});
  }

  handleAnalyticsClientReady() {
    let event = this.makeEvent({
          name: AnalyticsEventKeys.CLIENT_READY,
          properties: {
            time_since_launch: this.getTimeSinceAppLaunch()
          }
        });
    this.addToEventQueue(event);
  }

  // Called from `handleInitialDataFetched` instead of from its own event.
  handleInitialDataFetched() {
    this.metrics.stop({key: AnalyticsEventKeys.INITIAL_FETCH, id: "app", size: 0});
  }

  // hc_web.app.load
  handleAppInit(performance = this.performance) {
    if (performance && performance.now) {
      let readyForUser = Math.floor(performance.now());
      this.metrics.store({
        key: AnalyticsEventKeys.CLIENT_READY_FOR_USER,
        probes: readyForUser,
        size: 0,
        props: {
          readyForUser: readyForUser
        }
      });
    }
  }

  handleClientStart() {
    this.metrics.start({key: AnalyticsEventKeys.CONNECTION_ESTABLISHED, id: 'app', size: 0});
    this.metrics.start({key: AnalyticsEventKeys.INITIAL_FETCH, id: 'app', size: 0});
  }

  handleInitialConnection() {
    this.metrics.stop({key: AnalyticsEventKeys.CONNECTION_ESTABLISHED, id: "app", size: 0});
    this.metrics.start({key: AnalyticsEventKeys.INITIAL_PRESENCE, id: "app", size: 0});
    this.metrics.start({key: AnalyticsEventKeys.INITIAL_IQ, id: "app", size: 0});
    this.metrics.start({key: AnalyticsEventKeys.INITIAL_ROOMS, id: "app", size: 0});
    this.metrics.start({key: AnalyticsEventKeys.INITIAL_ROSTER, id: "app", size: 0});
    this.metrics.start({key: AnalyticsEventKeys.INITIAL_EMOTICONS, id: "app", size: 0});
  }

  // This is an addition to the onOpenRoom callback in analytics-events
  // hc_web.room.open
  // hc_web.room.files.load
  // hc_web.room.members.load
  handleOpenedRoom(properties) {
    this.metrics.start({key: AnalyticsEventKeys.ROOM_RENDER, id: properties.jid});
    this.metrics.start({key: AnalyticsEventKeys.ROOM_FILES_LOAD, id: properties.jid});
    this.metrics.start({key: AnalyticsEventKeys.ROOM_MEMBERS_LOAD, id: properties.jid});
  }

  // hc_web.room.open
  handleChatMountEvent(properties) {
    this.metrics.stop({key: AnalyticsEventKeys.ROOM_RENDER, id: properties.id, size: properties.size});
  }

  // hc_web.room.history.load
  handleHistoryRequest(properties) {
    this.metrics.start({key: AnalyticsEventKeys.ROOM_HISTORY_LOAD, id: properties.jid});
  }

  // hc_web.room.history.load
  handleHistoryResponse(properties) {
    this.metrics.stop({key: AnalyticsEventKeys.ROOM_HISTORY_LOAD, id: properties.jid, size: properties.size});
  }

  // hc_web.room.members.load
  handleRosterMount(properties) {
    this.metrics.stop({key: AnalyticsEventKeys.ROOM_MEMBERS_LOAD, id: properties.id, size: properties.size});
  }

  // hc_web.room.files.load
  handleFilesMount(properties) {
    this.metrics.stop({key: AnalyticsEventKeys.ROOM_FILES_LOAD, id: properties.id, size: properties.size});
  }

  // hc_web.lobby.panel.open
  handleLobbyOpen(properties) {
    if (utils.jid.is_lobby(properties.jid)) {
      this.metrics.start({key: AnalyticsEventKeys.LOBBY_RENDER, id: properties.jid, size: 0});
    }
  }

  // hc_web.lobby.panel.open
  handleLobbyMount(properties) {
    this.metrics.stop({key: AnalyticsEventKeys.LOBBY_RENDER, id: properties.id, size: 0});
  }

  handleReconnectionStart() {
    this.metrics.start({key: AnalyticsEventKeys.RECONNECTION, id: 'app', size: 0});
  }

  handleReconnectionSuccess() {
    this.metrics.stop({key: AnalyticsEventKeys.RECONNECTION, id: 'app', size: 0});
  }

  handlePresenceResponse() {
    this.metrics.stop({key: AnalyticsEventKeys.INITIAL_PRESENCE, id: 'app', size: 0, props: {method: "bosh"}});
  }

  handleStartupIqResponse() {
    this.metrics.stop({key: AnalyticsEventKeys.INITIAL_IQ, id: 'app', size: 0, props: {method: "bosh"}});
  }

  handleAuthStart() {
    this.metrics.start({key: AnalyticsEventKeys.AUTH, id: 'app', size: 0});
  }

  handleAuthDone() {
    this.metrics.stop({key: AnalyticsEventKeys.AUTH, id: 'app', size: 0, props: {method: "bosh"}});
  }

  handleDomReady() {
    let timings = utils.timings.getPerfTiming();
    this.metrics.store({key: AnalyticsEventKeys.DOM_READY, id: 'app', size: 0, props: timings});
  }

  handleLaunchToActiveChatList(data) {
    let probes = this.getTimeSinceAppLaunch();
    this.customBrowserMetricsEvent({
      key: AnalyticsEventKeys.LAUNCH_TO_ACTIVE_CHAT_LIST,
      size: _.get(data, "size"),
      probes: probes,
      method: "bosh"
    });
  }

  // Register one time performance events dependent upon app-state-ready
  handleAppStateReady() {
    if (!this.isGuest) {
      // Guests do not have an active chat list
      this.registerAppStateReadyAnalytics();
    }
  }

  handleLaunchToChat(data) {
    if (!this.shouldSendLaunchToChat) {
      return;
    }

    let probes = this.getTimeSinceAppLaunch();

    // Remember that we've sent it so that we don't let it through more than once
    this.shouldSendLaunchToChat = false;

    this.customBrowserMetricsEvent({
      key: AnalyticsEventKeys.LAUNCH_TO_CHAT,
      size: _.get(data, "size"),
      probes: probes,
      method: "bosh"
    });
  }

  handleLaunchToChatComplete(data) {
    if (!this.shouldSendLaunchToChatComplete) {
      return;
    }

    // Remember that we've sent it so that we don't let it through more than once
    this.shouldSendLaunchToChatComplete = false;

    let probes = this.getTimeSinceAppLaunch(),
        isRoom = utils.jid.is_room(data.jid),
        chatTypeIndicator = isRoom ? 0 : 1,
        chatId = `${isRoom ? 'r' : 'p'}${data.id}`;

    this.customBrowserMetricsEvent({
      key: AnalyticsEventKeys.LAUNCH_TO_CHAT_COMPLETE,
      size: chatTypeIndicator,
      chat: chatId,
      probes: probes,
      method: "bosh"
    });
  }

  /**
   * Decorates an event with the current server time and other required properties.
   *
   * @param event
   * @return {*}
   */
  makeEvent(event) {
    this.processRoomType(event);
    event.serverTime = utils.now();
    return _.merge({}, this.baseEvent, event);
  }

  addToEventQueue(event = {}) {
    if (!_.get(event, 'properties')){
      event = this.makeEvent(event);
    }
    this.eventQueue.push(event);
    logger.type('analytics').withFilter().alwaysExpanded().log('Event was added to queue:', event.name, event.properties, event);
  }

  getTimeSinceAppLaunch() {
    return utils.now() - this.appLaunchTime;
  }

  getIsGuest() {
    return (window.HC && window.HC.is_guest) ? window.HC.is_guest : false;
  }

  getSlug(clientIdentifier) {
    return clientIdentifier.client_subtype ? `${clientIdentifier.client_type}_${clientIdentifier.client_subtype}` : clientIdentifier.client_type;
  }

  getBaseEvent(groupId, userId, slug, isAdmin, versionId) {
    return {
      "server": `gid-${groupId}`,
      "product": AnalyticsEventKeys.PRODUCT,
      "subproduct": `hc_${slug}`,
      "version": versionId,
      "user": `uid-${userId}`,
      "properties": {
        client: slug,
        isAdmin: isAdmin,
        environment: ENV,
        type: slug,
        ver: versionId,
        os_ver: `${this.userAgent.os.name} ${this.userAgent.os.version || ""}`,
        browser: `${this.userAgent.browser.name} ${this.userAgent.browser.version}`
      }
    };
  }

  getHermentOptions(groupId, userId, versionId) {
    return {
      queue: this.eventQueue,
      storage_key: DAL.Cache.Keys.ANALYTICS,
      server: `gid-${groupId}`,
      product: AnalyticsEventKeys.PRODUCT,
      subproduct: `hc_${this.slug}`,
      version: versionId,
      user: `uid-${userId}`,
      unfold: true,
      publish_interval: AppConfig.analytics_publish_interval,
      save_interval: AppConfig.analytics_save_interval
    };
  }

  getBrowserMetricsBaseEvent(isAdmin, slug) {
    return {
      "name": AnalyticsEventKeys.BROWSER_METRICS,
      "properties": {
        "client": slug,
        "isAdmin": isAdmin,
        "environment": ENV
      }
    };
  }

  getRequiredClientFetchTimesObject(isGuest) {
    // Guests only fetch emoticons
    if (isGuest) {
      return {
        emoticons: null
      };
    }

    return {
      roster: null,
      rooms: null,
      emoticons: null
    };
  }

  /**
   * Ensures we have a valid room type.
   *
   * We sometimes get an event type. This makes sure this doesn't get through to GAS.
   *
   * @param event The event.
   * @return {*}
   */
  processRoomType(event) {
    if (event && event.properties && event.properties.type && !_.isString(event.properties.type)) {
      delete event.properties.type;
    }
  }

  deleteWindowLaunchTime() {
    delete window.hc_client_launch_time;
  }

  /**
   * Takes care of unregistering handlers for a given composite event and removing the association of those
   * handlers to this composite event.  If handlers are found for the event name specified, this will remove
   * them.  Otherwise it's essentially a noop.
   *
   * @param {String} name the name of the composite event you want to unstage
   */
  __unstageCompositeEvent(name) {
    // if we have a composite event with this name in the queue already, unregister its handlers
    let existingHandlers = _.get(this.compositeEventQueue, name);
    if (existingHandlers) {
      _.each(existingHandlers, (handler) => {
        handler.dispatcher.unregister(handler.name, handler.func);
      });

      // remove this composite event entry so that we know it has executed its handler
      delete this.compositeEventQueue[name];
    }
  }

  /**
   * Takes care of registering handlers for a given composite event and associating those
   * handlers to this composite event
   *
   * @param {String} name the name of the composite event
   * @param {Array} handlers
   */
  __stageCompositeEvent(name, handlers) {
    // now let's register the new handlers
    _.each(handlers, (handler) => {
      handler.dispatcher.register(handler.name, handler.func);
    });

    // and associate the handler map with the event name so that future register calls can clean them up if need be
    this.compositeEventQueue[name] = handlers;
  }

  /**
   * Handles the creation, spawning, and respawning logic for events that can't be fired until a set of
   * events has successfully fired.  This acts as sort of a debounce for composite events,
   *
   * @param {String} name the name of the composite event you intend to fire.
   * @param {*} starterData any data you have when you're spawning the composite event sequence
   */
  spawnCompositeEvent(name, starterData) {
    // Functions that generate the handler(s) associated with a given composite event.
    // These should all return an array of handler entry objects containing:
    // - dispatcher: The dispatcher to use when registering the function
    // - name: The name of the event to register the function for
    // - func: The function you need registered to that event
    let handlerCreationFunctions = {

      [AnalyticsEventKeys.CHAT_SENDABLE]: () => {
        let beginTime = new Date().getTime();
        // create a handler that will fire when we get the notification that a user is able to send text in a new chat
        let chatSendableHandler = (data) => {
          // if the jid matches the one we had when we spawned this composite event, let's fire the event
          if (starterData.jid === data.jid) {
            this.customBrowserMetricsEvent({
              key: AnalyticsEventKeys.CHAT_SENDABLE,
              size: utils.jid.is_room(data.jid) ? 0 : 1,
              probes: utils.now() - beginTime,
              method: "bosh"
            });

            // now let's remove any handlers that are tied to this composite event
            this.__unstageCompositeEvent(AnalyticsEventKeys.CHAT_SENDABLE);
          }
        };

        return [{ dispatcher: AnalyticsDispatcher, name: "analytics-active-chat-changed", func: chatSendableHandler }];
      },

      [AnalyticsEventKeys.CHAT_IS_COMPLETE]: () => {
        let beginTime = new Date().getTime();
        // create a handler that will fire when we get the notification that the chat loaded has received
        let chatIsCompleteHandler = (data) => {
          // if the jid matches the one we had when we spawned this composite event, let's fire the event
          if (starterData.jid === data.jid) {
            let isRoom = utils.jid.is_room(data.jid),
                chatTypeIndicator = isRoom ? 0 : 1,
                chatId = `${isRoom ? 'r' : 'p'}${data.id}`;
            this.customBrowserMetricsEvent({
              key: AnalyticsEventKeys.CHAT_IS_COMPLETE,
              size: chatTypeIndicator,
              chat: chatId,
              probes: utils.now() - beginTime,
              method: "bosh"
            });

            // now let's remove any handlers that are tied to this composite event
            this.__unstageCompositeEvent(AnalyticsEventKeys.CHAT_IS_COMPLETE);
          }
        };

        return [{ dispatcher: AnalyticsDispatcher, name: "analytics-history-loaded", func: chatIsCompleteHandler }];
      }

    };

    // lookup the handler creation function for the composite event specified
    var handlerCreator = handlerCreationFunctions[name];
    if (handlerCreator) {
      // first, remove any existing handlers that might be waiting to fire for this composite event
      this.__unstageCompositeEvent(name);
      // now, stage our new handlers
      this.__stageCompositeEvent(name, handlerCreator());
    }
  }

  /**
   * Reset variables
   * FOR TESTING ONLY
   * @method reset
   */
  __reset() {
    this.eventQueue = [];
    this.compositeEventQueue = {};
    this.isGuest = false;
    this.appLaunchTime = null;
    this.slug = null;
    this.browserMetricsBaseEvent = {};
    this.requiredClientUpToDateFetchTimes = null;
    this.requiredClientUpToDateFetchTimes = {};
  }
}
export default Analytics;


/** WEBPACK FOOTER **
 ** ./src/js/app/analytics/analytics.js
 **/