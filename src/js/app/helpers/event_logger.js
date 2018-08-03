/**
 * Subscribes to many important events through the app and logs output
 *
 * @class EventLogger
 */
var AppDispatcher = require("dispatchers/app_dispatcher");
var logger = require('helpers/logger');

class EventLogger {

  constructor() {
    this.registerCallbacks();
  }

  registerCallbacks() {
    $(document)
      .on('hc-ready', (e, data) => {
        logger.debug('[event: hc-ready]', "window.HC", {verbose: data});
      })
      .on('app-state-ready', () => {
        logger.debug('[event: app-state-ready]');
      });

    AppDispatcher.register({
      //app level stuff
      'app-state-connected': () => {
        logger.debug('[event: app-state-connected]');
      },
      'app-state-reconnected': () => {
        logger.debug('[event: app-state-reconnected]');
      },
      'attempt-disconnect': (data) => {
        logger.debug('[event: attempt-disconnect]', data);
      },
      'attempt-reconnect': () => {
        logger.debug('[event: attempt-reconnect]');
      },
      'application-blurred': () => {
        if (logger.isVerbose()) {
          logger.debug('[event: application-blurred]');
        }
      },
      'application-focused': () => {
        if (logger.isVerbose()) {
          logger.debug('[event: application-focused]');
        }
      },
      'unload-app': () => {
        logger.debug('[event: unload-app]');
      },
      'exit-app': (data) => {
        logger.debug('[event: exit-app]', data);
      },
      'signout': () => {
        logger.debug('[event: signout]');
      },

      //files
      'upload-successful': (data) => {
        logger.debug('[event: upload-successful]', logger.sanitize(data));
      },
      'upload-failed': (error) => {
        logger.debug('[event: upload-failed]', error);
      },
      'file-error': (data) => {
        logger.debug('[event: file-error]', logger.sanitize(data));
      },

      //user/presences, etc.
      'request-profile': (data) => {
        if (logger.isVerbose()) {
          logger.debug('[event: request-profile]', data);
        }
      },
      'send-user-state-message': (data) => {
        logger.debug('[event: send-user-state-message]', data);
      },
      'unmark-participant': (data) => {
        if (logger.isVerbose()) {
          logger.debug('[event: unmark-participant]', data);
        }
      },
      'mark-participant-unknown': (data) => {
        if (logger.isVerbose()) {
          logger.debug('[event: mark-participant-unknown]', data);
        }
      },
      'fetch-presences': (data) => {
        if (logger.isVerbose()) {
          logger.debug('[event: fetch-presences]', data);
        }
      },
      'filter-presences': (data) => {
        if (logger.isVerbose()) {
          logger.debug('[event: filter-presences]', data);
        }
      },
      'update-presence': (data) => {
        logger.debug('[event: update-presence]', data);
      },

      //routing, etc.
      'set-route': (data) => {
        logger.debug('[event: set-route]', data);
      },
      'fetch-previous': (data) => {
        logger.debug('[event: fetch-previous]', data);
      },
      'requesting-ancient-history': (data) => {
        logger.debug('[event: requesting-ancient-history]', data);
      },

      //rooms, etc.
      'close-room': (data) => {
        logger.debug('[event: close-room]', data);
      },
      'room-closed': (data) => {
        logger.debug('[event: room-closed]', data);
      },
      'open-room': (data) => {
        logger.debug('[event: open-room]', data);
      },
      'room-deleted': (data) => {
        logger.debug('[event: room-deleted]', data);
      },
      'DAL:handle-created-room': (data) => {
        logger.debug('[event: DAL:handle-created-room]', data);
      },
      'API:update-room': (data) => {
        logger.debug('[event: API:update-room]', data);
      },
      'update-room-order': (data) => {
        logger.debug('[event: update-room-order]', data);
      },
      'focus-video-window': (data) => {
        logger.debug('[event: focus-video-window]', data);
      },
      'new-active-chat': (data) => {
        logger.debug('[event: new-active-chat]', data);
      },
      'open-chat-by-mention-name': (data) => {
        logger.debug('[event: open-chat-by-mention-name]', data);
      },
      'join-room': (data) => {
        logger.debug('[event: join-room]', data);
      },
      'DAL:handle-joined-rooms': (data) => {
        if (logger.isVerbose()) {
          logger.debug('[event: DAL:handle-joined-rooms]', data);
        }
      },
      'save-client-preferences': (data) => {
        logger.debug('[event: save-client-preferences]', data);
      },
      'edit-topic': () => {
        logger.debug('[event: edit-topic]');
      },
      'delete-room': (data) => {
        logger.debug('[event: delete-room]', data);
      },
      'set-guest-access': (data) => {
        logger.debug('[event: set-guest-access]', data);
      },
      'navigate-rooms': (data) => {
        logger.debug('[event: navigate-rooms]', data);
      },
      'add-link-from-message': (data) => {
        if (logger.isVerbose()) {
          logger.debug('[event: add-link-from-message]', data);
        }
      },
      'add-file-from-message': (data) => {
        if (logger.isVerbose()) {
          logger.debug('[event: add-file-from-message]', logger.sanitize(data));
        }
      },
      'remove-room-participant': (data) => {
        logger.debug('[event: remove-room-participant]', data);
      },
      'guest-access-revoked': () => {
        logger.debug('[event: guest-access-revoked]');
      },
      'user-removed': (data) => {
        logger.debug('[event: user-removed]', data);
      },
      'add-room-visitor': (data) => {
        logger.debug('[event: add-room-visitor]', data);
      },
      'room-presence-received': (data) => {
        if (logger.isVerbose()) {
          logger.debug('[event: room-presence-received]', data);
        }
      },
      'chat-fully-initialized': (data) => {
        logger.debug('[event: chat-fully-initialized]', data);
      },
      'archive-room': (data) => {
        logger.debug('[event: archive-room]', data);
      },
      'unarchive-room': (data) => {
        logger.debug('[event: unarchive-room]', data);
      },
      'room-archived': (data) => {
        logger.debug('[event: room-archived]', data);
      },
      'room-unarchived': (data) => {
        logger.debug('[event: room-unarchived]', data);
      },

      //dialogs, etc.
      'show-flag': (data) => {
        logger.debug('[event: show-flag]', data);
      },
      'show-modal-dialog': (data) => {
        logger.debug('[event: show-modal-dialog]', data);
      },
      'files-fetched': (data) => {
        logger.debug('[event: files-fetched]', data);
      },
      'links-fetched': (data) => {
        logger.debug('[event: links-fetched]', data);
      },
      'hide-modal-dialog': () => {
        logger.debug('[event: hide-modal-dialog]');
      },
      'remove-flag': (data) => {
        logger.debug('[event: remove-flag]', data);
      },
      'show-integration-view': (data) => {
        logger.debug('[event: show-integration-view]', data);
      },
      'refresh-integrations': (data) => {
        logger.debug('[event: refresh-integrations]', data);
      },
      'integration-update': (data) => {
        logger.debug('[event: integration-update]', data);
      },

      //search
      'search-history': (data) => {
        logger.debug('[event: search-history]', data);
      },
      'set-search-text': (data) => {
        logger.debug('[event: set-search-text]', data);
      },
      'blur-search': () => {
        logger.debug('[event: blur-search]');
      },

      //video
      'video-window-event': (data) => {
        logger.debug('[event: video-window-event]', data);
      },
      'missed-call': (data) => {
        logger.debug('[event: missed-call]', data);
      },

      //other
      'enable-dark-feature': (data) => {
        logger.debug('[event: enable-dark-feature]', data);
      },
      'dismiss-notification-banner': () => {
        logger.debug('[event: dismiss-notification-banner]');
      },
      'dismiss-notification-banner-forever': () => {
        logger.debug('[event: dismiss-notification-banner-forever]');
      },
      'request-notification-permission': () => {
        logger.debug('[event: request-notification-permission]');
      },
      'resend-message': (data) => {
        logger.debug('[event: resend-message]', data);
      },
      'groupchat-invite-accepted': (data) => {
        logger.debug('[event: groupchat-invite-accepted]', data);
      },
      'error-message-received': (data) => {
        logger.debug('[event: error-message-received]', data);
      },
      'replacement-message-received': (data) => {
        logger.debug('[event: replacement-message-received]', data);
      },
      'handle-cached-room': (data) => {
        logger.debug('[event: handle-cached-room]', data);
      },
      'groupchat-invite-received': (data) => {
        logger.debug('[event: groupchat-invite-received]', data);
      },
      'private-chat-invite-received': (data) => {
        logger.debug('[event: private-chat-invite-received]', data);
      },
      'guest-access-enabled': (data) => {
        logger.debug('[event: guest-access-enabled]', data);
      },
      'remove-chat-state-message': (data) => {
        logger.debug('[event: remove-chat-state-message]', data);
      }
    });
  }

}

module.exports = new EventLogger();



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/event_logger.js
 **/