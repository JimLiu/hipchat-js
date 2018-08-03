import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import IdleManager from 'core/idle/idle_manager';
import ConnectionManager from 'core/xmpp/connection_manager';
import spi from 'spi';
import AvatarHelper from 'helpers/avatar_helper';
import ConfigStore from 'stores/configuration_store';
import AppConfig from 'config/app_config';
import PreferencesStore from 'stores/preferences_store';
import utils from 'helpers/utils';
import UploadFileHelper from 'helpers/upload_file_helper';
import FileHelper from 'helpers/file_helper';
import Logger from 'helpers/logger';
import NetworkStatusHelper from 'helpers/network_status_helper';
import DialogActions from "actions/dialog_actions";
import PresenceSubscriptionHelper from 'helpers/presence_subscription_helper';
import DAL from 'core/dal';
import Presence from 'lib/enum/presence';
import VideoModule from 'helpers/video_module';

export default (config) => {

  var initialPresenceProcessed = false;
  var outgoing_message_predicate = utils.createSafePredicate(AppConfig.outgoing_message_filter_predicate, AppConfig);
  var upload_file_helper = new UploadFileHelper();

  const signOut = (data) => {
    $(window).off('beforeunload');
    upload_file_helper.destroy();
    spi.onSignOut(DAL, data);
  };

  const onConnectFetchData = () => {
    if (ConfigStore.isGuest()) {
      //The following block is to build a roster from the room participants,
      //because guests shouldn't have access to the full roster
      let roomId = ConfigStore.get('room_id');

      DAL.Room.getById(roomId)
        .then((room) => AppDispatcher.dispatch('DAL:handle-new-room', {
          jid: room.jid,
          name: room.name,
          x: room
        }));
      DAL.Emoticon.getEmoticonsAsXMPP((data) => {
        AnalyticsDispatcher.dispatch('analytics-emoticons-loaded', {verbose: data});
      });
      DAL.fetchParticipants(roomId)
        .then((resp) => AppDispatcher.dispatch('DAL:guest-fetched-room-participants', resp))
        .catch((err) => Logger.type('dal').error('[fetch-room-participants]', err.message));

    } else {
      let cachedEmoticons = null;

      Promise.all([
        DAL.Cache.getRosterAsXMPP(),
        DAL.Cache.getRoomsAsXMPP(),
        DAL.Cache.getEmoticonsAsXMPP()
      ])
      .then(function ([ roster, rooms, emoticons ]) {
        if (roster) {
          AppDispatcher.dispatch('server-data', roster);
        }
        if (rooms) {
          AppDispatcher.dispatch('server-data', rooms);
        }
        if (emoticons) {
          cachedEmoticons = emoticons;
        }
        return Promise.all([
          DAL.User.getRosterAsXMPP(),
          DAL.Room.getRoomsAsXMPP(),
          DAL.Emoticon.getEmoticonsAsXMPP(cachedEmoticons)
        ]);
      })
      .then(function ([ roster, rooms, emoticons ]) {
        AppDispatcher.dispatch('server-data', roster);
        AppDispatcher.dispatch('server-data', rooms);
        AppDispatcher.dispatch('server-data', emoticons || cachedEmoticons);
        AnalyticsDispatcher.dispatch('analytics-roster-loaded', { verbose: roster });
        AnalyticsDispatcher.dispatch('analytics-rooms-loaded', { verbose: rooms });
        AnalyticsDispatcher.dispatch('analytics-emoticons-loaded', { verbose: emoticons });
      })
      .catch((err) => {
        Logger.type('dal').error('[fetch-roster/fetch-rooms/fetch-emoticons]', err.message);
      });
    }
  };

  AppDispatcher.register({
    'hipchat-client-configured': () => {
      DAL.attemptConnect();
    },
    'strophe-reconnecting': () => {
      AnalyticsDispatcher.dispatch('analytics-hc-client-reconnection-start');
      IdleManager.stop();
    },
    'strophe-authenticating': () => {
      if (ConnectionManager.isInitialConnect()) {
        AnalyticsDispatcher.dispatch('analytics-initial-auth-start');
      }
    },
    'strophe-disconnected': () => {
      AnalyticsDispatcher.dispatch('analytics-event', {
        name: 'hipchat.client.disconnected'
      });
      IdleManager.stop();
    },
    'strophe-connection-failed': (stropheStatus, reason) => {
      AnalyticsDispatcher.dispatch('analytics-event', {
        name: `hipchat.client.${ConnectionManager.isInitialConnect() ? 'connection' : 'reconnection'}.failed`,
        properties: { reason }
      });
      if (!ConnectionManager.isInitialConnect()) {
        AppDispatcher.dispatch('reconnect-fail');
      }
      IdleManager.stop();
      let errorMsg = `[Connection Failure] ${reason}`;
      Logger.error(errorMsg);
      Logger.type('strophe-connection-failed').error(reason);
      spi.onStropheConnectionFailed(errorMsg);
    },
    'strophe-policy-violation': (stropheStatus, reason) => {
      let errorMsg = `[Authentication Failure] ${reason}`;
      Logger.error(errorMsg);
      Logger.type('strophe-auth-failed').error(reason);
      spi.onStrophePolicyViolation({ reason, web_server: ConfigStore.get('web_server') });
    },
    'strophe-auth-failed': (stropheStatus, reason) => {
      let errorMsg = `[Authentication Failure] ${reason}`;
      Logger.error(errorMsg);
      Logger.type('strophe-auth-failed').error(reason);
      spi.onStropheAuthFailed(errorMsg);
    },
    'reconnection-error': (error) => {
      spi.onReconnectionError(error);
    },
    'strophe-connected': () => {
      AnalyticsDispatcher.dispatch("analytics-hc-client-initial-connection");
      // The following is an approximation; The difference between the actual auth success and this is about ~100+ms
      // and may include other interactions. The proper solution would be embedding an event into
      // hipchatAuthSuccessCallback in hipchat.js
      AnalyticsDispatcher.dispatch("analytics-initial-auth-done");

      var group_avatar_bg = AvatarHelper.getGroupAvatarDefaultColor(ConfigStore.get('group_id'));
      var initialConfig = _.merge(ConfigStore.getAll(), {
        feature_flags: config.feature_flags,
        group_avatar_bg: group_avatar_bg || AppConfig.default_group_avatar_bg
      });

      new VideoModule();

      AppDispatcher.dispatch('hc-init', initialConfig);

      AnalyticsDispatcher.dispatch('analytics-hc-init', {});

      onConnectFetchData();
      PresenceSubscriptionHelper.init();

      DAL.sendInitialPresence().then(() => {
        Logger.type('dal').log('[update-presence]', `Successfully sent initial presence`);
      });
      IdleManager.start();
    },
    'strophe-reconnected': () => {
      if (ConfigStore.isGuest() && ConfigStore.get('room_jid')) {
        DAL.joinRoom(ConfigStore.get('room_jid'))
          .then((room) => AppDispatcher.dispatch('DAL:handle-joined-rooms', room))
          // TODO: probably need a generic flag component for throwing common errors. For now, the global trap
          // TODO: will throw a flag if it sees a presence error, so any errs here should already be covered
          .catch((err) => Logger.error(err.message));
      } else {
        // wait till the config updates so we have the updated autoJoin list before sending up join presences
        AppDispatcher.registerOnce('updated:config', () => {
          DAL.joinRooms(PreferencesStore.getAutoJoinRooms(), 0)
            .then((chats) => AppDispatcher.dispatch('DAL:handle-joined-rooms', chats))
            .catch((err) => Logger.type('dal').error('[join-rooms]', err.message));
        });
      }

      AnalyticsDispatcher.dispatch("analytics-event", {
        name: "hipchat.client.reconnected"
      });
      AnalyticsDispatcher.dispatch("analytics-hc-client-reconnection-success");

      onConnectFetchData();
      PresenceSubscriptionHelper.resubscribe();

      IdleManager.start();
      DAL.sendInitialPresence(IdleManager.isIdle() ? Presence.IDLE : Presence.AVAILABLE).then(() => {
        Logger.type('dal').log('[update-presence]', `Successfully sent initial presence`);
        if (!IdleManager.isIdle()) {
          AppDispatcher.dispatch('set-current-user-active');
        }
      });
    },
    'user-on-call': () => {
      IdleManager.stop();
    },
    'user-leave-call': () => {
      IdleManager.start();
    },
    'close-room': (data) => {
      if (!data.doNotNotifyHC){
        DAL.leaveRoom(data.jid, data.type)
          .catch((err) => Logger.type('dal').error('[leave-room]', err.message));
      }
    },
    'fetch-files': ({ room, before, after }) => {
      // TODO: Remove this default limit value once HC-28429 is fixed
      DAL.fetchFiles(room, before, after, AppConfig.fetching_files_limit)
        .then((response) => {
          AppDispatcher.dispatch('DAL:handle-fetched-files', response);
        })
        .catch((err) => {
          Logger.type('dal').error('[fetch-files]', err.message);
          AppDispatcher.dispatch('DAL:handle-fetched-files', { jid: room, files: [], end: true });
        });
    },
    'fetch-links': ({ room, before, after }) => {
      // TODO: Remove this default limit value once HC-28429 is fixed
      DAL.fetchLinks(room, before, after, AppConfig.fetching_links_limit)
        .then((response) => {
          AppDispatcher.dispatch('DAL:handle-fetched-links', response);
        })
        .catch((err) => {
          Logger.type('dal').error('[fetch-links]', err.message);
          AppDispatcher.dispatch('DAL:handle-fetched-links', { jid: room, links: [], end: true });
        });
    },
    'create-room': (data, cb) => {
      DAL.Room.create(data.name, data.topic, data.privacy)
        .then((room) => {
          AppDispatcher.dispatch('DAL:handle-created-room', room);
          if (room.privacy === "private") {
            DialogActions.showInviteUsersDialog();
          } else {
            DialogActions.closeDialog();
          }
          cb(null, room);
        })
        .catch((err) => {
          Logger.type('dal').error('[create-room]', err.message);
          cb(err);
        });
    },
    'delete-room': (data, callback) => {
      DAL.Room.delete(data.id, data.jid)
        .then(() => {
          callback();
        })
        .catch((err) => {
          Logger.type('dal').error('[delete-room]', err.message);
          callback(err);
        });
    },
    'change-room-privacy': (data, callback) => {
      DAL.Room.setPrivacy(data.jid, data.privacy)
        .then(callback)
        .catch((err) => {
          Logger.type('dal').error('[set-room-privacy]', err.message);
          callback(err);
        });
    },
    'change-room-name': (data, callback) => {
      DAL.Room.rename(data.jid, data.name)
        .then(callback)
        .catch((error) => {
          Logger.type('dal').error('[rename-room]', error.message);
          callback(error);
        });
    },
    'update-presence': (presence) => {
      spi.onChangeUserStatus(presence.show);
      DAL.setPresence(presence.show, presence.status).then(() => {
        Logger.type('dal').log('[update-presence]', `Successfully set presence to ${presence.show}, ${presence.status}`);
      });
    },
    'set-guest-access': (data, callback = _.noop) => {
      DAL.Room.setGuestAccess(data.jid, data.enable)
        .then(() => {
          callback();
        })
        .catch((err) => {
          Logger.type('dal').error('[set-guest-access]', err.message);
          callback(err);
        });
    },
    'guest-access-revoked': () => {
      signOut(DAL, {});
    },
    'sync-preferences': (data) => {
      DAL.savePreferences(data, () => {
        AppDispatcher.dispatch('preferences-saved', data);
      });
    },
    'request-profile': (jid, cb) => {
      DAL.fetchProfile(jid, cb);
    },
    'filter-presences': (ids) => {
      DAL.filterPresences(ids).then(() => {
        Logger.type('dal').log('[filter-presence]', `Updated presence filter to ${ids.join(',')}`);
      });
    },
    'fetch-presences': (ids) => {
      DAL.fetchPresences(ids);
    },
    'attempt-reconnect': () => {
      DAL.attemptReconnect();
    },
    'attempt-reconnect-without-reset': () => {
      DAL.attemptReconnect(false);
    },
    'attempt-disconnect': (should_reconnect) => {
      DAL.terminateChatSession(should_reconnect);
    },
    'network-down': () => {},
    'network-up': () => {
      DAL.attemptReconnect();
    },
    'fetch-previous': (data, cb) => {
      DAL.fetchHistory(data.jid, data.oldest || null, AppConfig.message_retrieval_chunk_size, data.id, cb);
    },
    'upload-file': (data) => {
      let uploadParams = {
            path: {
              identifier: data.room_id
            },
            params: {
              file: data.file,
              fileName: data.fileName,
              message: data.message
            }
          },
          jid = data.jid,
          emitter = DAL.sendFileMessage(jid, uploadParams);
          emitter.on('progress', (percentage) => {
                    AppDispatcher.dispatch('upload-progress-update', {
                      percentage,
                      jid
                    });
                  })
                  .on('success', () => {
                    AppDispatcher.dispatch('upload-successful', {
                      message: 'fileName: ' + data.fileName,
                      text: data.message,
                      jid
                    });
                  })
                  .on('error', (error) => {
                    AppDispatcher.dispatch('upload-failed', {
                      error: error,
                      jid
                    });
                  })
                  .on('complete', () => {
                    AppDispatcher.dispatch('upload-complete', {
                      jid
                    });
                    emitter.removeAllListeners(); // Cleanup
                  });
    },
    'send-message': (data) => {
      if (!NetworkStatusHelper.isOnline()) {
        Logger.type('dal').warn('[send-message]', 'client appears to be offline, aborting send-message');
        return;
      } else if (!DAL.isConnected()) {
        Logger.type('dal').warn('[send-message]', 'client appears to be disconnected, aborting send-message');
        return;
      }
      if (outgoing_message_predicate(data)) {
        DAL.sendMessage(data);
      }
    },
    'edit-message': (data) => {
      DAL.editMessage(data.jid, data.message, data.original_mid, data.ts);
    },
    'delete-message': (message) => {
      DAL.deleteMessage(message);
    },
    'resend-message': (data) => {
      if (outgoing_message_predicate(data)) {
        DAL.sendMessage(data);
      }
    },
    'send-topic': ({ jid, topic }) => {
      DAL.Room.setTopic(jid, topic)
        .then(() => {
          AppDispatcher.dispatch('DAL:handle-topic-updated', { jid, topic });
        })
        .catch((err) => Logger.type('dal').error('[set-topic]', err.message));
    },
    'fetch-room-participants': (room, includeOffline = true) => {
      DAL.fetchParticipants(room.id, includeOffline)
        .then((resp) => AppDispatcher.dispatch('DAL:fetched-room-participants', resp))
        .catch((fetchParticipantsErr) => {
          Logger.type('dal').error('[fetch-room-participants]', fetchParticipantsErr.message);
          Logger.type('dal').warn('[fetch-room-participants]', 'fallback to fetch participants via XMPP join without maxmemberpresences');
          //Note: This joins the rooms a second time. Not ideal but is currently the only mechanism to request room participants via XMPP.
          AppDispatcher.dispatch('set-room-participants-fully-initialized', room.jid);
          DAL.joinRoom(room.jid, 0, false)
            .then((joinedRoom) => AppDispatcher.dispatch('DAL:handle-joined-rooms', joinedRoom))
            .catch((joinedRoomErr) => Logger.type('dal').error('[join-room]', joinedRoomErr.message));
        });
    },
    'fetch-room': (jid, cb) => {
      DAL.Room.getByJid(jid)
        .then((room) => cb(null, room))
        .catch((err) => {
          Logger.type('dal').error('[fetch-room-by-jid]', err.message);
          cb(err);
        });
    },
    'open-room': (data) => {
      if (!utils.jid.is_private_chat(data.jid)) {
        DAL.Room.getByJid(data.jid)
          .catch((err) => {
            Logger.type('dal').error('[fetch-room-by-jid]', err.message);
          });
        DAL.joinRoom(data.jid)
          .then((room) => AppDispatcher.dispatch('DAL:handle-joined-rooms', room))
          .catch((err) => Logger.type('dal').error('[join-room]', err.message));
      } else {
        DAL.joinChat(data.jid);
      }
    },
    'exit-app': (data) => {
      signOut(DAL, data);
    },
    'app-state-ready': () => {
      $(document).trigger("app-state-ready");
      let chatToFocus = PreferencesStore.getChatToFocus();
      if (chatToFocus && utils.jid.is_room(chatToFocus)) {
        AppDispatcher.dispatch('initial-join-presence-sent', {
          jid: chatToFocus,
          with_history: false
        });
      }
      DAL.joinRooms(PreferencesStore.getAutoJoinRooms())
        .then((chats) => AppDispatcher.dispatch('DAL:handle-joined-rooms', chats))
        .catch((err) => Logger.type('dal').error('[join-rooms]', err.message));

      spi.onAppStateReady(ConfigStore.getAll());

      if (!console) { return; }
      console.emote("Hey there … Trying to reverse engineer something? Why not join our team instead?");
      console.emote("Apply at https://www.hipchat.com/jobs and mention this comment.");
    },
    'invite-users': (data) => {
      DAL.inviteUsersToRoom(data.room_jid, data.user_jids, data.reason);
    },
    'remove-users': (data, cb) => {
      DAL.removeUsersFromRoom(data.room_jid, data.user_jids, cb);
    },
    'send-user-state-message': (data) => {
      DAL.sendStateMessage(data.jid, data.type, data.state);
    },
    'send-video-message': (data) => {
      DAL.sendVideoMessage(data.jid, data.type, data.audio_only, data.url, data.service, data.callback, data.reason);
    },
    'request-addlive-credentials': (data, cb) => {
      DAL.requestAddliveCredentials(data.jid, cb);
    },
    'clear-web-cookies': (cb = _.noop) => {
      DAL.clearWebCookies(cb);
    },
    'revoke-oauth2-token': (cb = _.noop) => {
      DAL.revokeOauth2Token(cb);
      DAL.terminateChatSession(false);
    },
    'DAL:fetch-readstate': () => {
      DAL.fetchReadstate();
    },
    'DAL:update-readstate': (data) => {
      DAL.updateReadstate(data);
    },
    'DAL:remove-readstate': (data) => {
      DAL.removeReadstate(data);
    },
    'DAL:retry-readstate': () => {
      DAL.retryReadstate();
    },
    'DAL:reset-readstate': () => {
      DAL.resetReadstate();
    },
    'server-data': (data) => {
      if (!initialPresenceProcessed && 'presence' in data) {
        initialPresenceProcessed = true;
        AnalyticsDispatcher.dispatch("analytics-initial-presence-response-received", {verbose: data});
      }
    },
    'apiv1-token-update-requested': () => {
      DAL.updateAPIV1Token();
    },
    'auth-token-update': (data) => {
      if ('apiv1_token' in data) {
        Logger.debug("Updating API v1 auth token: ", Logger.sanitize(data));
        spi.onInternalTokenRefreshed(data.apiv1_token);
      }
    },
    'before:new-active-chat': (data) => {
      let isChat = utils.jid.is_chat(data.jid);
      spi.onChangeActiveChat(isChat);
      AnalyticsDispatcher.dispatch("analytics-new-active-chat", data);
    },
    'API:fetch-recent-history': (data) => {
      DAL.fetchRecentHistory(data, ({ error, items }) => {
        if (!error && items){
          AppDispatcher.dispatch('API:fetched-recent-history', {
            jid: data.jid,
            results: items,
            mid: data.params['not-before']
          });
        } else {
          Logger.type('dal').error('[fetch-recent-history]', error);
        }
      });
    },
    'API:update-room': (data, cb) => {
      DAL.Room.update(data, cb);
    },
    'API:sync-integrations': (data, cb) => {
      DAL.syncIntegrations(data, cb);
    },
    'API:get-signed-url': (data, parameters, cb) => {
      DAL.getSignedUrl(data, parameters, cb);
    },
    'API:request-with-signed-url': (data, parameters, cb) => {
      DAL.requestWithSignedUrl(data, parameters, cb);
    },
    'API:fetch-all-glances-for-room': (data, cb) => {
      DAL.fetchAllGlancesForRoom(data, cb);
    },

    'API:fetch-signed-file': (data, cb = _.noop, errCb = _.noop) => {
      DAL.fetchSignedFile(data.url).then(cb).catch(errCb);
    },
    'API:upload-room-avatar': (data, cb = _.noop) => {
      DAL.Room.uploadAvatar(data.id, data.avatar).then(cb).catch(cb);
    },
    'API:fetch-signed-thumbnail': (file, cb = _.noop, errCb = _.noop) => {
      let featureFlags = ConfigStore.get('feature_flags');
      let multiGetThumbnails = featureFlags.web_client_secure_files_multi_get_for_thumbnails;
      if(multiGetThumbnails) {
        FileHelper.fetchSignedThumbnail(file, cb, errCb);
      } else {
        DAL.fetchSignedFile(file.thumb_url).then(cb).catch(errCb);
      }
    },
    'API:fetch-signed-thumbnail-collection': (fileObj) => {
      DAL.fetchSignedThumbnailCollection(fileObj);
    },
    'API:fetch-last-message': (data, cb) => {
      data.params = {
        'max-results': 1
      };
      DAL.fetchRecentHistory(data, response => {
        cb({
          jid: data.jid,
          items: response.items
        });
      });
    },
    'API:fetch-alert-flag': () => {
      DAL.fetchAlertFlag()
        .then(data => {
          AppDispatcher.dispatch('API:fetch-alert-flag-success', data);
        })
        .catch(error => {
          Logger.type('dal').error('[API:fetch-alert-flag]', error);
          AppDispatcher.dispatch('API:fetch-alert-flag-failure', error);
        });
    },
    'API:dismiss-alert-flag': ({ id }) => {
      DAL.dismissAlertFlag({ id })
        .then(() => {
          AppDispatcher.dispatch('API:dismiss-alert-flag-success');
        })
        .catch(error => {
          Logger.type('dal').error('[API:dismiss-alert-flag]', error);
          AppDispatcher.dispatch('API:dismiss-alert-flag-failure', error);
        });
    },
    'API:fetch-read-only-content': () => {
      DAL.fetchReadOnlyContent()
        .then(data => {
          AppDispatcher.dispatch('API:fetch-read-only-content-success', data);
        })
        .catch(error => {
          Logger.type('dal').error('[API:fetch-read-only-content]', error);
          AppDispatcher.dispatch('API:fetch-read-only-content-failure', error);
        });
    }
  });
};



/** WEBPACK FOOTER **
 ** ./src/js/app/hipchat-client/app-dispatcher-events.js
 **/