import ReadStateRequest from './readstate_request';
import ReadStateError from './readstate_error';
import ConfigStore from 'stores/configuration_store';
import utils from 'helpers/utils';
import logger from 'helpers/logger';
import NetworkStatusHelper from 'helpers/network_status_helper';
import * as Constants from 'core/common/constants';
import DALCache from 'core/dal.cache';


class ReadState {

  constructor(config = {}) {
    this.request = new ReadStateRequest();

    // set this to a valid log level to enable logging
    this.logLevel = null;

    this.queued = false;
    this.waiting = false;
    this.disabled = false;
    this.fetched = false;

    this.timer = null;
    this.backoff = Constants.READSTATE_DEFAULT_BACKOFF;
    this.retryCount = 0;
    this.api_token = null;

    this.fetchCallback = config.fetchCallback || _.noop;
    this.patchCallback = config.patchCallback || _.noop;

    this.state = {
      server: null,
      client: {},
      inflight: {}
    };

    this.debouncedPatch = _.debounce(this.tryPatch, Constants.READSTATE_UPDATE_DEBOUNCE).bind(this);
  }

  log(){
    if (logger.levels.indexOf(this.logLevel) !== -1) {
      logger[this.logLevel].apply(logger, arguments);
    }
  }

  loadStorage() {
    this.log('[ReadState] loadStorage');
    return DALCache.get(DALCache.Keys.READSTATE).then((storedClientState) => {
      if (_.isPlainObject(storedClientState) && !_.isEmpty(storedClientState)) {
        this.state.client = storedClientState;
        DALCache.unset(DALCache.Keys.READSTATE);
        this.queued = true;
      }
    });
  }

  fetch() {
    this.log('[ReadState] fetch');

    this.clearTimer();

    this.state.server = null;
    this.fetched = false;
    this.tryFetch();
  }

  update(data) {
    if (!utils.jid.is_chat(data.jid)) { return false; }
    this.log('[ReadState] update', data);

    this.state.client[data.jid] = {
      op: 'add',
      mid: data.mid,
      timestamp: data.timestamp
    };
    DALCache.set(DALCache.Keys.READSTATE, this.state.client);

    if (this.fetched) {
      this.debouncedPatch();
    }
  }

  remove(data) {
    if (!utils.jid.is_chat(data.jid)) { return false; }
    this.log('[ReadState] remove', data);

    this.state.client[data.jid] = {
      op: 'remove'
    };
    DALCache.set(DALCache.Keys.READSTATE, this.state.client);

    if (this.fetched) {
      this.debouncedPatch();
    }
  }

  retry() {
    this.log('[ReadState] retry');

    this.disabled = false;
    this.dequeue();
  }

  reset() {
    this.log('[ReadState] reset');

    this.clearTimer();

    this.queued = false;
    this.state.client = {};
    DALCache.unset(DALCache.Keys.READSTATE);
  }

  tryFetch() {
    this.log('[ReadState] tryFetch');

    if (!NetworkStatusHelper.isOnline()) {
      this.log('[ReadState] Aborting fetch', { 'isOnline': NetworkStatusHelper.isOnline() });
      this.fetchCallback(ReadStateError.OFFLINE, null);
      this.enqueue(this.backoff);
      return;

    } else if (this.waiting) {
      this.log('[ReadState] Aborting fetch', { 'waiting': this.waiting });
      return;
    }

    this.waiting = true;
    this.disabled = false;

    this.api_token = ConfigStore.get('oauth_token');

    if (this.queued) {
      this.request.get(this.handleRefetchResponse.bind(this), false);
    } else {
      this.request.get(this.handleGetResponse.bind(this), true);
    }
  }

  tryPatch() {
    this.log('[ReadState] tryPatch');

    if (!NetworkStatusHelper.isOnline()){
      this.log('[ReadState] Aborting patch', { 'isOnline': NetworkStatusHelper.isOnline() });
      this.patchCallback(ReadStateError.OFFLINE, null);
      return;

    } else if (this.waiting){
      this.log('[ReadState] Aborting patch', { 'waiting': this.waiting });
      this.queued = true;
      return;

    } else if (!this.state.server) {
      this.log('[ReadState] Aborting patch', { 'serverState': this.state.server });
      this.queued = true;
      this.fetch();
      return;

    } else if (this.disabled) {
      this.log('[ReadState] Aborting patch', { 'disabled': this.disabled });
      return;
    }

    this.patch(this.state.client);
  }

  patch(data, withCounts = false) {
    var patch_data = this.buildPatchBody(data);

    if (patch_data.length === 0) {
      this.log('[ReadState] Aborting patch', {
        'patch_data': patch_data,
        'withCounts': withCounts
      });
      this.queued = false;
      if (withCounts) {
        this.fetch();
        this.waiting = true;
      }
      return;
    }

    this.log('[ReadState] Sending patch data', patch_data);

    this.waiting = true;
    this.queued = false;

    this.api_token = ConfigStore.get('oauth_token');

    DALCache.unset(DALCache.Keys.READSTATE);
    this.state.inflight = _.clone(data);
    this.state.client = {};

    this.request.patch(patch_data, this.handlePatchResponse.bind(this), withCounts);
  }

  buildPatchBody(state) {
    var body = [];

    _.forOwn(state, (val, key) => {
      let obj = {
            op: val.op,
            path: '/' + key
          };

      if (val.op === 'add') {
        obj.value = {
          mid: val.mid || Constants.READSTATE_NULL_MID,
          timestamp: val.timestamp ? val.timestamp.toFixed(6) : Constants.READSTATE_NULL_TS
        };
      }

      let server_ts = _.get(this.state.server[key], 'timestamp', 0);
      if (val.op === 'remove' || !server_ts || (val.timestamp && server_ts < val.timestamp)) {
        body.push(obj);
      }
    });

    return body;
  }

  handleResponse(err, res) {
    this.disabled = false;
    this.waiting = false;

    this.handleError(err);
    this.updateBackoffInterval(res, err);
    this.handleBackoff();
  }

  handleError(err) {
    if (!err) {
      this.retryCount = 0;
      return false;
    }

    this.queued = true;

    let errorHandlers = {
          [ReadStateError.UNAUTHORIZED]: () => {
            this.disabled = true;
            if (this.api_token !== ConfigStore.get('oauth_token')) {
              this.retry();
            } else {
              ConfigStore.once('change:oauth_token', this.retry.bind(this));
            }
          },
          [ReadStateError.BAD_REQUEST]: () => {
            this.disabled = true;
            this.reset();
          },
          [ReadStateError.DISABLED]: () => {
            this.disabled = true;
          },
          [ReadStateError.RATE_LIMITED]: () => {
            this.retryCount++;
          },
          [ReadStateError.UNAVAILABLE]: () => {
            this.retryCount++;
          }
        };

    if (errorHandlers[err]) {
      this.log('[ReadState] handleError: %s', err);
      errorHandlers[err]();
    }
  }

  handleServerData(body) {
    body = (body && Array.isArray(body.items)) ? body.items : [];
    this.resetServerState(body);
    this.fetched = true;
    return body;
  }

  handleGetResponse(err, body, res) {
    var data = null;

    this.handleResponse(err, res);
    if (!err) {
      data = this.handleServerData(body);
    }
    this.fetchCallback(err, data);
  }

  handleRefetchResponse(err, body, res) {
    this.handleResponse(err, res);

    if (err) {
      return this.fetchCallback(err, null);
    }

    this.handleServerData(body);
    this.patch(this.state.client, true);
  }

  handlePatchResponse(err, body, res) {
    this.handleResponse(err, res);

    if (err) {
      this.reapplyInflightData();
    } else {
      this.updateServerState();
    }

    if (body) {
      var data = this.handleServerData(body);
      this.fetchCallback(err, data);
    }

    this.patchCallback(err, body);
  }

  updateBackoffInterval(res, err) {
    var backoff = res.backoff ? res.backoff * 1000 : 0;

    if (err === ReadStateError.RATE_LIMITED) {
      backoff = this.handleRateLimitReset(res.rateLimitReset, res.serverTime, backoff);

    } else if (err === ReadStateError.UNAVAILABLE) {
      backoff = this.jitterBackoff(backoff);
      backoff = Math.min(backoff, Constants.READSTATE_MAX_BACKOFF);
    }

    if (backoff && backoff !== this.backoff) {
      this.log('[ReadState] Changing backoff interval. New value: %s', backoff);
      this.backoff = backoff;
    }
  }

  handleRateLimitReset(resetTime, serverTime, backoff) {
    var nowTime = serverTime ? serverTime : Date.now(),
        diff = (resetTime + 5) - nowTime;

    return diff > 0 ? diff * 1000 : this.jitterBackoff(backoff);
  }

  jitterBackoff(backoff) {
    var max = Constants.READSTATE_MAX_BACKOFF,
        base = Constants.READSTATE_DEFAULT_BACKOFF,
        factor = Constants.READSTATE_BACKOFF_FACTOR;

    return utils.decorrelatedJitter(max, backoff || base, this.backoff, factor);
  }

  handleBackoff() {
    this.log('[ReadState] handleBackoff', {
      backoff: this.backoff,
      disabled: this.disabled
    });
    this.clearTimer();
    if (this.backoff && !this.disabled) {
      this.enqueue(this.backoff);
    }
  }

  enqueue(backoff) {
    this.waiting = true;
    this.timer = setTimeout(this.dequeue.bind(this), backoff);
  }

  dequeue() {
    this.log('[ReadState] dequeue');
    this.clearTimer();
    if (!this.state.server || !this.fetched) {
      this.fetch();
    } else if (this.queued) {
      this.queued = false;
      this.tryPatch(false);
    }
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.waiting = false;
    }
  }

  resetServerState(data) {
    this.state.server = {};

    if (!Array.isArray(data)){
      return;
    }

    data.forEach((chat) => {
      if (chat.xmppJid){
        this.state.server[chat.xmppJid] = {
          mid: chat.mid,
          timestamp: Number(chat.timestamp)
        };
      }
    });
  }

  reapplyInflightData() {
    _.forOwn(this.state.inflight, (val, key) => {
      if (!this.state.client[key] || val.timestamp > this.state.client[key].timestamp) {
        this.state.client[key] = val;
      }
    });

    this.state.inflight = {};
    DALCache.set(DALCache.Keys.READSTATE, this.state.client);
  }

  updateServerState() {
    if (!this.state.server) {
      this.state.server = {};
    }

    _.forOwn(this.state.inflight, (val, key) => {
      if (this.state.server[key] && val.op === 'remove') {
        delete this.state.server[key];
      } else if (!this.state.server[key] || val.timestamp > Number(this.state.server[key].timestamp)) {
        this.state.server[key] = val;
      }
    });

    this.state.inflight = {};
  }

}

export default ReadState;



/** WEBPACK FOOTER **
 ** ./src/js/core/rest/readstate/index.js
 **/