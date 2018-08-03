import AppConfig from 'config/app_config';
import AppDispatcher from 'dispatchers/app_dispatcher';
import utils from 'helpers/utils';

class PresenceSubscriptionHelper {

  constructor(config) {

    this.initialized = false;

    this.current_filter_list = [];

    /** Object keyed by user id representing how many components we have on the screen that care about this user's presence
     *
     * @type {{}}
     */
    this.subscribed = {};

    /** list of user ids that we still haven't fetched presence for yet
     *
     * @type {Array}
     */
    this.pending_presence_fetch = [];

    this.debouncedFilterPresences = _.debounce(this._filterPresences, config.filter_participant_presences_timeout, {
      leading: false,
      trailing: true
    });

    this.throttledRequestPresences = _.throttle(this._requestPresences, config.request_participant_presences_timeout, {
      leading: false,
      trailing: true
    });

  }

  /**
   * Initialize the subscription helper
   *
   * @method init
   */
  init() {
    this.initialized = true;
    this.resubscribe();
  }

  /**
   * Add one or more UIDs to the presence subscription object
   *
   * @method addUsers
   * @param {Array} uids
   */
  subscribeToPresence(uids) {

    let uids_array = utils.toArray(uids);

    this._incrementSubscriptionCounts(uids_array);

    this.throttledRequestPresences();
    this.debouncedFilterPresences();
  }

  /**
   * Remove one or more UIDs from the presence subscription object
   *
   * @method removeUsers
   * @param {Array} uids
   */
  unsubscribeFromPresence(uids) {

    let uids_array = utils.toArray(uids);

    this._decrementSubscriptionCounts(uids_array);

    this.debouncedFilterPresences();
  }

  /**
   * Resubscribe to presence changes
   *
   * @method resubscribe
   */
  resubscribe() {
    this.pending_presence_fetch = _.keys(this.subscribed);
    this.throttledRequestPresences();
    this.debouncedFilterPresences();
  }

  _incrementSubscriptionCounts(uids) {
    _.forEach(uids, (uid) => {
      uid = uid.toString();
      if (this.subscribed[uid]) {
        this.subscribed[uid]++;
      } else {
        this.subscribed[uid] = 1;

        // we don't want to explicitly fetch a presence if we're already listening for changes
        if (!_.includes(this.current_filter_list, uid) && !_.includes(this.pending_presence_fetch, uid)) {
          this.pending_presence_fetch.push(uid);
        }
      }
    });
  }

  _decrementSubscriptionCounts(uids) {
    _.forEach(uids, (uid) => {
      uid = uid.toString();
      if (this.subscribed[uid] > 1) {
        this.subscribed[uid]--;
      } else {
        this.subscribed = _.omit(this.subscribed, uid);
        _.pull(this.pending_presence_fetch, uid);
      }
    });
  }

  _filterPresences() {

    // get the list of users who've been added or removed
    let filter = _.keys(this.subscribed),
      changeset = _.xor(this.current_filter_list, filter),
      changed = !_.isEmpty(changeset);

    // only make the request if there are changes, we're initialized, and there's a uid list to filter on
    if (changed && this.initialized && filter.length) {
      this.current_filter_list = filter;
      AppDispatcher.dispatch('filter-presences', this.current_filter_list);
    }
  }

  _requestPresences() {

    let uniq = _.uniq(this.pending_presence_fetch);

    // only fetch if we are initialized and we have a uid list
    if (uniq.length && this.initialized) {
      AppDispatcher.dispatch('fetch-presences', uniq);

      // clear out the list so that it's built fresh the next time the throttled call executes
      this.pending_presence_fetch = [];
    }
  }

}

export {PresenceSubscriptionHelper as PresenceSubscriptionHelperClass};

export default new PresenceSubscriptionHelper(AppConfig);



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/presence_subscription_helper.js
 **/