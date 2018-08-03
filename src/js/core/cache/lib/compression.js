import User from 'core/models/user';
import Room, { PrivacyLevels as Privacy } from 'core/models/room';
import Emoticon, { EmoticonTypes } from 'core/models/emoticon';
import * as Keys from '../browser_storage/browser_storage_keys';
import utils from 'helpers/utils';

/*
 * Compression algorithms for saving space in localStorage
 * Keyed by the localStorage key
 */
const Compressors = {

  /*
   * Compression algorithm for dealing with the Roster. Data is stored as:
   * {
   *   g: <group_id>,    // used to reconstruct jids
   *   c: <chat_server>, // used to reconstruct jids
   *   u: {
   *     <user_id>: [
   *       <user_name>,
   *       <user_mention_name>,
   *       <user_email>,
   *       <user_photo_url>,
   *       <user_version>
   *     ]
   *   }
   * }
   */
  [Keys.ROSTER]: {

    dehydrate (roster) {
      if (_.isNull(roster)) {
        return null;
      }
      return _.transform(roster, function (result, user, id) {
        result['g'] = result['g'] || utils.jid.group_id(user.jid);
        result['c'] = result['c'] || utils.jid.domain(user.jid);
        result['u'] = result['u'] || {};
        result['u'][id] = [
          user.name,
          user.mention_name,
          user.email,
          user.photo_url,
          user.version
        ];
        return result;
      });
    },

    rehydrate (roster) {
      if (_.isNull(roster)) {
        return null;
      }
      return _.transform(roster['u'], function (result, user, id) {
        result[id] = new User({
          id: parseInt(id, 10),
          jid: `${ roster['g'] }_${ id }@${ roster['c'] }`,
          name: user[0],
          mention_name: user[1],
          email: user[2],
          photo_url: user[3],
          version: user[4],
          is_guest: false,  // guest users are not saved to storage
          is_deleted: false // deleted users are not saved to storage
        });
        return result;
      });
    }
  },

  /*
   * Compression algorithm for dealing with the RoomsList. Data is stored as:
   * {
   *   g: <group_id>,    // used to reconstruct jids
   *   c: <conf_server>, // used to reconstruct jids
   *   u: {
   *     <room_id>: [
   *       <room_name>,
   *       <room_slug>, // the unique part of the jid
   *       <room_privacy>, public: 0, private: 1
   *       <room_owner>,
   *       <room_guest_url>,
   *       <room_avatar_url>,
   *       <room_version>
   *     ]
   *   }
   * }
   */
  [Keys.ROOMS]: {

    dehydrate (rooms) {
      if (_.isNull(rooms)) {
        return null;
      }
      return _.transform(rooms, function (result, room, id) {
        result['g'] = result['g'] || utils.jid.group_id(room.jid);
        result['c'] = result['c'] || utils.jid.domain(room.jid);
        result['u'] = result['u'] || {};
        result['u'][id] = [
          room.name,
          utils.jid.room_name(room.jid),
          (room.privacy === Privacy.PUBLIC ? 1 : 0),
          room.owner,
          room.guest_url,
          room.avatar_url,
          room.version
        ];
        return result;
      });
    },

    rehydrate (rooms) {
      if (_.isNull(rooms)) {
        return null;
      }
      return _.transform(rooms['u'], function (result, room, id) {
        result[id] = new Room({
          id: parseInt(id, 10),
          name: room[0],
          jid: `${ rooms['g'] }_${ room[1] }@${ rooms['c'] }`,
          privacy: (room[2] === 1 ? Privacy.PUBLIC : Privacy.PRIVATE),
          owner: room[3],
          guest_url: room[4],
          avatar_url: room[5],
          version: room[6],
          topic: null,
          is_archived: false,
          is_deleted: false
        });
        return result;
      });
    }
  },

  /*
   * Compression algorithm for dealing with the EmoticonList. Data is stored as:
   * {
   *   p: <path_prefix>,
   *   v: <query ver="v">,
   *   i: [
   *     [
   *       <id>,
   *       <path>,
   *       <shortcut>,
   *       <width>,
   *       <height>,
   *       <type> global: 0, group: 1
   *     ]
   *   ]
   * }
   */
  [Keys.EMOTICONS]: {

    dehydrate (iq) {
      if (_.isNull(iq)) {
        return null;
      }
      return {
        p: iq.query.path_prefix,
        v: iq.query.ver,
        i: _.map(iq.query.item, function (emoticon, i) {
          return [
            parseInt(emoticon.id, 10),
            emoticon.shortcut,
            emoticon.path,
            parseInt(emoticon.w, 10),
            parseInt(emoticon.h, 10),
            (emoticon.type === EmoticonTypes.GROUP ? 1 : 0)
          ];
        })
      };
    },

    rehydrate (emoticons) {
      if (_.isNull(emoticons)) {
        return null;
      }
      return {
        type: 'result',
        query: {
          path_prefix: emoticons['p'],
          ver: emoticons['v'],
          item: emoticons['i'].map((emoticon, i) => {
            return new Emoticon({
              id: emoticon[0],
              shortcut: emoticon[1],
              path: emoticon[2],
              w: emoticon[3],
              h: emoticon[4],
              type: (emoticon[5] === 1 ? EmoticonTypes.GROUP : EmoticonTypes.GLOBAL)
            });
          })
        }
      };
    }
  }
};


/**
 * @module Compressors
 */
export default {

  /**
   * @method dehydrate
   * @param {string} key - one of browser storage keys
   * @param {*} val - the data to be compressed
   * @returns {*} - the compressed version, if there is a compression algorithm for the given key
   *  otherwise, returns the data it was passed
   */
  dehydrate (key, val) {
    if (Compressors[key]) {
      return Compressors[key].dehydrate(val);
    }
    return val;
  },

  /**
   * @method rehydrate
   * @param {string} key - one of browser storage keys
   * @param {*} val - the data to be decompressed
   * @returns {*} - the decompressed version, if there is a compression algorithm for the given key
   *  otherwise, returns the data it was passed
   */
  rehydrate (key, val) {
    if (Compressors[key]) {
      return Compressors[key].rehydrate(val);
    }
    return val;
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/core/cache/lib/compression.js
 **/