import AppDispatcher from 'dispatchers/app_dispatcher';
import utils from 'helpers/utils';

class PresenceProcessor {

  constructor(data) {
    this.processorData = data;
    this.queued = [];
    this.ready = false;
    this.subscribeToEvents();
  }

  subscribeToEvents() {
    AppDispatcher.registerOnce('app-state-ready', () => {
      this.ready = true;
      this.handlePresence(this.queued);
      this.queued = [];
    });
  }

  update(data) {
    this.processorData = null;
    this.processorData = data;
  }

  handlePresence(presences) {
    let presArray = utils.toArray(presences);
    if (!this.ready) {
      this.queued = this.queued.concat(presArray);
    } else {
      if (this.processorData.is_guest) {
        this.handlePresencesForGuest(presArray);
      } else {
        let groupedPresences = _.groupBy(presArray, (pres) => {
          if (utils.jid.is_room(utils.jid.bare_jid(pres.from))) {
            return 'room';
          }
          return 'global';
        });
        this.handleRoomPresences(groupedPresences['room']);
        this.handleGlobalPresences(groupedPresences['global']);
      }
    }
  }

  handlePresencesForGuest(presArray) {
    _.forEach(presArray, (pres) => {
      pres.x = utils.toArray(pres.x);

      this._handleUser(pres);

      // Transform for global presences
      this.roomToGlobalPresence(pres);
    });

    this.handleGlobalPresences(presArray);
  }

  _handleUser(pres) {
    let item = _.get(pres.x[0], 'item');

    if(item) {
      let jid = utils.jid.bare_jid(pres.from);

      if (pres.type === "unavailable") {
        this._handleUnavailableUser(pres, item);

      } else if (item.role === "participant") {
        this.addRoomParticipant(jid, utils.jid.bare_jid(item.jid), utils.jid.resource(pres.from), pres);

      } else if (item.role === "visitor") {
        this.addRoomVisitor(jid, utils.jid.bare_jid(item.jid), utils.jid.resource(pres.from), item.mention_name, pres);
      }
    }
  }

  _handleUnavailableUser(pres, item) {
    let jid = utils.jid.bare_jid(pres.from);

    if (this._isAddresseeCurrentUser(pres, item) && this._hasNotAffiliation(pres, item)) {
      this.revokeGuestAccess();
    } else {
      this.removeRoomParticipant(jid, utils.jid.bare_jid(item.jid), item.role, pres.status);
    }
  }

  _isAddresseeCurrentUser(pres, item) {
    let currentUserJid = utils.jid.bare_jid(pres.to);

    return currentUserJid === item.jid;
  }

  _hasNotAffiliation(pres, item) {
    let status = _.get(pres.x[0], 'status');

    return status && Number(status.code) === 307 && item.affiliation === 'none';
  }

  roomToGlobalPresence(pres) {
    // Guests & Visitors have room presences
    // that must be handled like global presences
    pres.x = utils.toArray(pres.x);
    pres.from = _.get(pres, "x[0].item.jid", pres.from);
  }

  handleRoomPresences(presences) {
    var jid;
    _.map(presences, (presence) => {
        jid = utils.jid.bare_jid(presence.from);
        if (presence.x) {
          presence.x = utils.toArray(presence.x);
          if (presence.x[0].item) {
            var item = presence.x[0].item;

            if (presence.type === 'unavailable'
              && _.isString(presence.status)
              && (item.affiliation === 'member' || item.affiliation === 'owner')) {

              this.removeRoomParticipant(jid, utils.jid.bare_jid(item.jid), item.role, presence.status);

            } else if (presence.x[0].status
              && Number(presence.x[0].status.code) === 307
              && item.affiliation === 'none') {

              if (item.actor && (utils.jid.bare_jid(item.actor.jid) === item.jid)) {
                // Basic close room
                AppDispatcher.dispatch('close-room', {
                  jid: jid
                });
              } else {
                // User was removed by admin
                AppDispatcher.dispatch('user-removed', {
                  room: jid,
                  user_jid: utils.jid.bare_jid(item.jid),
                  role: item.role
                });
              }

            } else if (item.role === 'visitor') {

              this.addRoomVisitor(jid, utils.jid.bare_jid(item.jid), utils.jid.resource(presence.from), item.mention_name, presence);

            } else if (item && item.jid) {

              AppDispatcher.dispatch('room-presence-received', {
                room: jid,
                user_jid: utils.jid.bare_jid(item.jid),
                user_id: utils.jid.user_id(item.jid),
                role: item.role,
                affiliation: item.affiliation,
                type: presence.type || ""
              });
            }
          }
        } else if (presence.type === 'error'
          && presence.error) {

          AppDispatcher.dispatch('show-flag', {
            type: "error",
            title: presence.error.text.__text,
            close: "auto"
          });

          AppDispatcher.dispatch('close-room', {
            jid: jid,
            type: 'room',
            doNotNotifyHC: true
          });
        }
      }
    );
  }

  handleGlobalPresences(presences) {
    var presObj = {};
    _.forEach(presences, (presence) => {
      var jid = utils.jid.bare_jid(presence.from);
      var seconds = (presence.query) ? presence.query.seconds : false;
      var delay = (presence.delay) ? presence.delay.stamp : false;
      var show = this.getState(presence);
      if (!(this.processorData.current_user_jid === jid && (show === "mobile" || show === "unavailable"))) {
        presObj[jid] = {
          show: show,
          status: presence.status || '',
          seconds: seconds || '',
          idleTime: this.getIdleTime(seconds, delay)
        };
      }
    });
    if (_.size(presObj) > 0) {
      AppDispatcher.dispatch('global-presence-received', presObj);
    }
  }

  getState(presence) {
    if (presence.type && presence.type === 'unavailable' && presence.mobile) {
      return 'mobile';
    } else if (presence.type && presence.type === 'unavailable' && !presence.mobile) {
      return 'unavailable';
    } else if (presence.show) {
      return presence.show;
    }
    return 'chat';
  }

  getIdleTime(seconds, delay) {
    var result = "";
    if (delay && seconds) {
      var now = utils.getMoment();
      var seconds_diff = now - (utils.getMoment(delay) - seconds);
      result = utils.user.format_idle_time(seconds_diff);
    }
    return result;
  }

  revokeGuestAccess() {
      AppDispatcher.dispatch('guest-access-revoked');
  }

  addRoomParticipant(room_jid, user_jid, user_name, presence) {
    AppDispatcher.dispatch('add-room-participant', {
      room: room_jid,
      user_jid: user_jid,
      user_name: user_name,
      presence: {
        show: this.getState(presence),
        status: presence.status || ''
      }
    });
  }

  removeRoomParticipant(room_jid, participant_jid, role, status) {
    AppDispatcher.dispatch('remove-room-participant', {
      room: room_jid,
      participant: participant_jid,
      role: role === 'visitor' ? 'guests' : 'members',
      status: status || ''
    });
  }

  addRoomVisitor(room_jid, participant_jid, participant_name, mention, presence) {
    AppDispatcher.dispatch('add-room-visitor', {
      room: room_jid,
      participant: participant_jid,
      user_name: participant_name,
      user_mention: mention,
      presence: {
        show: this.getState(presence),
        status: presence.status || ''
      }
    });
  }
}

module.exports = PresenceProcessor;



/** WEBPACK FOOTER **
 ** ./src/js/app/processors/presence_processor.js
 **/