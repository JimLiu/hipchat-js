import utils from 'helpers/utils';
import * as Constants from 'core/common/constants';
import ConnectionManager from './xmpp/connection_manager';
import REST from './rest/rest';
import DALCache from './dal.cache';
import DALError from './models/dal-error';

/**
 * @module DALSync
 */
const DALSync = {

  /**
   * Gets the full roster. Will try to first sync
   * @method getRoster
   * @returns {Promise<Roster, DALError>}
   */
  getRoster() {
    let syncRoster = (cached) => {
      // Try to sync via Coral. If it fails, download the world via XMPP
      return this._tryToSync(this._syncRosterViaREST.bind(this), cached)
        .catch((err) => {
          // console.error(err)
          return this._syncRosterViaXMPP();
        });
    };

    return DALCache.get(DALCache.Keys.ROSTER).then((cached) => {

      // if it's been over 3 minutes, just go ahead and try to sync via Coral
      if (!ConnectionManager.Connection.Cache.isReconnectedWithinSyncThreshold()) {
        return syncRoster(cached);
      }

      // If it's been under 3 minutes, ask the server if our cached data is in sync.
      // If so, resolve with the cache. Otherwise try to sync via Coral
      return ConnectionManager.Connection.Cache.isResourceInSync(DALCache.Keys.ROSTER, cached).then((isSynced) => {
        if (isSynced) {
          return cached;
        }
        return syncRoster(cached);
      });
    });
  },

  /**
   * Gets the full list of rooms. Will try to first sync
   *
   * @method getRoomsList
   * @returns {Promise<RoomsList, DALError>}
   */
  getRoomsList() {
    let syncRooms = (cached) => {
      // Try to sync via Coral. If it fails, download the world via XMPP
      return this._tryToSync(this._syncRoomsViaREST.bind(this), cached)
        .catch((err) => {
           //console.error(err)
          return this._syncRoomsViaXMPP();
        });
    };

    return DALCache.get(DALCache.Keys.ROOMS).then((cached) => {

      // if it's been over 3 minutes, just go ahead and try to sync via Coral
      if (!ConnectionManager.Connection.Cache.isReconnectedWithinSyncThreshold()) {
        return syncRooms(cached);
      }

      // If it's been under 3 minutes, ask the server if our cached data is in sync.
      // If so, resolve with the cache. Otherwise try to sync via Coral
      return ConnectionManager.Connection.Cache.isResourceInSync(DALCache.Keys.ROOMS, cached).then((isSynced) => {
        if (isSynced) {
          return cached;
        }
        return syncRooms(cached);
      });
    });
  },

  /**
   * Given the provided sync method (either this._syncRosterViaREST
   * or this._syncRoomsViaREST) try to sync successfully. If the
   * sync request fails with a 403 or 404 error, or if it's tried
   * 5 times, then reject with appropriate error.
   *
   * @method _tryToSync
   * @returns {Promise<*,DALError>}
   * @private
   */
  _tryToSync(syncFn, ...syncArgs) {
    return new Promise((resolve, reject) => {
      let attempts = 1,
        delay = Constants.RECONNECT_DELAY_MS,
        tryAgain,
        onError;

      // If the sync function failed:
      onError = (dalError) => {

        // If we've tried 5 times, give up and reject
        if (attempts >= 5) {
          reject(DALError.ofType(DALError.Types.RATE_LIMITED));
          return;
        }

        // If we get a 403 or 404 response we cannot recover, so reject
        if (_.includes([403, 404], dalError.status)) {
          reject(dalError);
          return;
        }

        // otherwise, bump our "attempts" count, and try again after jittered backoff
        attempts++;
        delay = utils.decorrelatedJitter(Constants.RECONNECT_MAX_DELAY, Constants.RECONNECT_DELAY_MS, delay, Constants.RECONNECT_BACKOFF_FACTOR);
        setTimeout(tryAgain, delay);
      };

      // Call the sync function. If it succeeds, resolve with the response
      tryAgain = () => {
        syncFn(...syncArgs).then(resolve).catch(onError);
      };

      tryAgain();
    });
  },

  /**
   * Try the happy path to sync'ing the Roster. Will generate a version-map
   * of the users in the cache and send that up to the server. The server will
   * respond with a diff of the users that are different than what we sent up.
   * We'll apply the diff, create an aggregate hash, and ask the server for their
   * aggregate hash. If they match, we resolve with the updated roster. If any
   * of the requests fail or if the hashes do not match, we reject with an
   * appropriate error
   *
   * @method _syncRosterViaREST
   * @returns {Promise<Roster, DALError>}
   * @private
   */
  _syncRosterViaREST(cached) {
    let syncedRoster = cached ? _.cloneDeep(cached) : {};
    return REST.syncRoster(cached).then((serverDiff) => {
      serverDiff.forEach((user) => {
        syncedRoster[user.id] = user;
      });
      return Promise.all([
        DALCache.updateRoster(serverDiff),
        ConnectionManager.Connection.Cache.isResourceInSync(DALCache.Keys.ROSTER, syncedRoster)
      ]);
    })
    .then(([,isSynced]) => {
      if (isSynced) {
        return syncedRoster;
      }
      return Promise.reject(DALError.ofType(DALError.Types.OUT_OF_SYNC));
    });
  },

  /**
   * Try the happy path to sync'ing the RoomsList. Will generate a version-map
   * of the users in the cache and send that up to the server. The server will
   * respond with a diff of the rooms that are different than what we sent up.
   * We'll apply the diff, create an aggregate hash, and ask the server for their
   * aggregate hash. If they match, we resolve with the updated data. If any
   * of the requests fail or if the hashes do not match, we reject with an
   * appropriate error
   *
   * @method _syncRoomsViaREST
   * @returns {Promise<RoomsList, DALError>}
   * @private
   */
  _syncRoomsViaREST(cached) {
    let syncedRooms = cached ? _.cloneDeep(cached) : {};
    return REST.syncRooms(cached).then((serverDiff) => {
        serverDiff.forEach((room) => {
          syncedRooms[room.id] = room;
        });
        return Promise.all([
          DALCache.updateRooms(serverDiff),
          ConnectionManager.Connection.Cache.isResourceInSync(DALCache.Keys.ROOMS, syncedRooms)
        ]);
      })
      .then(([,isSynced]) => {
        if (isSynced) {
          return syncedRooms;
        }
        return Promise.reject(DALError.ofType(DALError.Types.OUT_OF_SYNC));
      });
  },

  /**
   * Request the entire roster from XMPP. This is the fallback case if syncing fails.
   *
   * @returns {Promise<Roster, DALError>}
   * @private
   */
  _syncRosterViaXMPP() {
    let roster;
    return ConnectionManager.Connection.Roster.getRoster().then((users) => {
      roster = users.reduce(function (result, user) {
        result[user.id] = user;
        return result;
      }, {});
      return DALCache.set(DALCache.Keys.ROSTER, roster).catch(_.noop);
    }).then(() => roster);
  },

  /**
   * Request the entire room list from XMPP. This is the fallback case if syncing fails.
   *
   * @returns {Promise<RoomsList, DALError>}
   * @private
   */
  _syncRoomsViaXMPP() {
    let roomsList;
    return ConnectionManager.Connection.Rooms.getAll().then((rooms) => {
      roomsList = rooms.reduce(function (result, room) {
        result[room.id] = room;
        return result;
      }, {});
      return DALCache.set(DALCache.Keys.ROOMS, roomsList).catch(_.noop);
    }).then(() => roomsList);
  }

};

export default DALSync;


/** WEBPACK FOOTER **
 ** ./src/js/core/dal.sync.js
 **/