import AppDispatcher from "dispatchers/app_dispatcher";
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import utils from 'helpers/utils';
import generalErrorHelper from 'helpers/general_error_helper';
import ConfigActions from 'actions/config_actions';
import ConfigurationModel from 'models/configuration_model';
import logger from 'helpers/logger';

class IQProcessor {

  constructor(data) {
    var is_guest = _.get(data,'is_guest', false);

    this.deferredReady = () => {
      return new Promise((res) => {
        AppDispatcher.dispatch('app-state-ready');
        res();
      });
    };

    // Set instance variables
    this.__reset();
    this.storedRequiredStanzas = [];
    this.requiredStanzas = [];
    this.setRequiredStanzas(is_guest);
  }

  setRequiredStanzas(is_guest) {
    var stanzas;
    if (is_guest) {
      stanzas = ['http://hipchat.com/protocol/emoticons'];
    } else {
      stanzas = ['jabber:iq:roster', 'http://jabber.org/protocol/disco#items', 'http://hipchat.com/protocol/emoticons'];
    }
    this.requiredStanzas = this.requiredStanzas.concat(stanzas);
  }

  addRequiredStartupStanza() {
    this.requiredStanzas.unshift('http://hipchat.com/protocol/startup');
  }

  /**
   * Handles an incoming IQ stanza.
   *
   * Must be called with processor instance context (bind, call, apply)
   *
   * @param iq_stanza The IQ stanza
   * @param store The store to receive the stanza.
   */
  handleIQ(iq_stanza, store) {
    _.forEach(utils.toArray(iq_stanza), (iq) => {
      if (iq.query) {
        this.handleOrStoreStanza(iq, store);
      }
    });
  }

  handleStanza(iq, store) {
    switch (iq.query.xmlns) {
      case 'jabber:iq:roster':
        logger.debug('Roster Received', {verbose: iq});
        if (_.has(iq, "query.item") && (iq.type !== 'set' || this.__isReady())) {
          store.handleRoster(iq.query.item);
        } else {
          logger.debug('Roster Update Skipped', {verbose: iq});
        }
        break;
      case 'http://jabber.org/protocol/disco#info':
        var room = {
          jid: iq.from,
          name: _.get(iq, 'query.identity.name'),
          x: _.get(iq, 'query.x')
        };
        store.handleRooms(room);
        break;
      case 'http://jabber.org/protocol/disco#items':
        logger.debug('Rooms List Received', {verbose: iq});
        if (_.has(iq, "query.item")) {
          store.handleRooms(iq.query.item);
        }
        break;
      case 'http://hipchat.com/protocol/profile':
        store.handleProfile(iq);
        break;
      case 'http://hipchat.com/protocol/emoticons':
        logger.debug('Emoticons Received', {verbose: iq});
        if (_.has(iq, "query")) {
          store.handleEmoticons(iq.query, iq.type);
        }
        break;
      case 'http://hipchat.com/protocol/muc#room':
        if (_.has(iq, "query.item") && (iq.type !== 'set' || this.__isReady())) {
          store.determineRoomUpdate(iq.query.item);
        }
        break;
      case 'http://hipchat.com/protocol/integrations':
        this.__handleIntegrations(iq);
        break;
      case 'http://hipchat.com/protocol/integrations#ui':
        this.__handleIntegrationsUiPush(iq);
        break;
      case 'http://hipchat.com/protocol/startup':
        store.handleStartupIQAutoJoin([].concat(_.get(iq, 'query.preferences.autoJoin.item', [])));
        ConfigActions.updateAppConfiguration(new ConfigurationModel(iq.query));
        AnalyticsDispatcher.dispatch("analytics-start-iq-response-received");
        break;
      default:
        return true;
    }
  }

  /**
   * Handles or stores an IQ stanza depending on the init-state of the app.
   *
   * If a non-required IQ stanza arrives before all of the required stanzas have been processed,
   * it is stored it temporarily.
   *
   * Once all {@link requiredStanzas} have arrived, we process the stanzas stored in {@link otherStanzas}.
   *
   * @param iq The IQ stanza to process.
   * @param store The store to receive the stanza.
   */
  handleOrStoreStanza(iq, store) {
    if (this.allRequiredStanzasProcessed) {
      this.handleStanza(iq, store);
      return;
    }

    if (!this.allRequiredStanzasProcessed
      && _.includes(this.requiredStanzas, iq.query.xmlns)
      && _.get(iq, ['type']) !== 'set') {
      if (iq.error) {
        generalErrorHelper(iq);
      } else {
        this.storedRequiredStanzas.push(iq);

        this.receivedRequiredStanzas[iq.query.xmlns] = true;
        this.allRequiredStanzasProcessed = this.allRequiredStanzasArrived();

        if (this.allRequiredStanzasProcessed) {
          this.flushRequiredStanzas(store);
          this.flushNonRequiredStanzas(store);
          this.deferredReady().catch((e) => {
            logger.type('iq-processor').withCallStack().error(e);
            logger.error(e);
            AnalyticsDispatcher.dispatch("analytics-event", {
              name: 'hipchat.client.load.error',
              properties: {
                errorMessage: e.message,
                errorName: e.name,
                errorDescription: e.description,
                errorStack: e.stack
              }
            });
          });
        }
      }
    } else {
      this.queueStanza(iq);
    }
  }

  /**
   * Processes all required stanzas which we've received in the proper order.
   *
   * @param store
   */
  flushRequiredStanzas(store) {
    let handle = (namespace) => {
      let stanza = _.find(this.storedRequiredStanzas, (stnz) => {
        return _.get(stnz, ['query', 'xmlns']) === namespace;
      });
      this.handleStanza(stanza, store);
      _.pull(this.storedRequiredStanzas, stanza);
    };
    _.every(this.requiredStanzas, (namespace) => {
      if (namespace === 'http://hipchat.com/protocol/startup') {
        AppDispatcher.registerOnce('after:updated:config', () => {
          _.each(this.requiredStanzas, (ns) => {
            handle(ns);
          });
        });
        handle(namespace);
        _.pull(this.requiredStanzas, namespace);
        return false;
      }
      handle(namespace);
      return true;
    });
  }

  /**
   * Processes all non-required stanzas which have built up before the app is ready.
   *
   * @param store
   */
  flushNonRequiredStanzas(store) {
    _.each(this.otherStanzas, (iq) => {
      this.handleStanza(iq, store);
    });
    this.otherStanzas = [];
  }

  /**
   * Stores an IQ stanza to be processed later.
   *
   * @param iq
   */
  queueStanza(iq) {
    this.otherStanzas.push(iq);
  }

  /**
   * Returns true if all required stanzas have arrived.
   * @returns {*}
   */
  allRequiredStanzasArrived() {
    return _.every(this.requiredStanzas, (stanza) => {
      return this.receivedRequiredStanzas[stanza];
    });
  }

  /**
   * Resets the IQProcessor to the initial state.
   *
   * Exposed for testing only.
   *
   * @private
   */
  __reset() {
    this.allRequiredStanzasProcessed = false;
    this.receivedRequiredStanzas = {};
    this.otherStanzas = [];
    this.storedRequiredStanzas = [];
    this.requiredStanzas = [];
  }

  /**
   * Returns the current value of allRequiredStanzasProcessed.
   *
   * Exposed for testing only.
   * @private
   */
  __isReady() {
    return this.allRequiredStanzasProcessed;
  }

  __handleIntegrations(iq) {
    if(iq.type === 'set') {

      let data = iq.query.__text;
      if(typeof data === "string") {
        data = JSON.parse(data);
      }

      AppDispatcher.dispatch('integration-update', data);
    }
  }

  __handleIntegrationsUiPush(iq) {
    if(iq.type === 'set') {

      let data = iq.query.__text;
      if(typeof data === "string") {
        data = JSON.parse(data);
      }
      let glances = data.glance;
      AppDispatcher.dispatch('glance-metadata-pushed', utils.toArray(glances));
    }
  }

}

module.exports = IQProcessor;



/** WEBPACK FOOTER **
 ** ./src/js/app/processors/iq_processor.js
 **/