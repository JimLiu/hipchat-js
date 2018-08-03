export const event_names = Object.freeze({
  REMOVE_DATA_FOR_ROOMS: 'integrations-remove-data-for-rooms',
  ON_INTEGRATIONS_REMOVED: 'integrations-removed',
  ON_INTEGRATIONS_UPDATED: 'integration-update',
  ON_INTEGRATIONS_UPDATE_SUMMARY: 'integrations-update-summary'
});

export const states = Object.freeze({
  INIT: 'init',
  STARTING: 'starting',
  STARTED: 'started',
  STOPPED: 'stopped',
  DISABLED: 'disabled',
  ERROR: 'error'
});

export const glance_room_states = Object.freeze({
  WAITING: 'waiting',
  INIT: 'init',
  LOADING: 'loading',
  LOADED: 'loaded',
  DIRTY: 'dirty'
});

export const extension_types = Object.freeze({
  GLANCE: 'glance',
  DIALOG: 'dialog',
  ACTION: 'action',
  EXTERNAL_PAGE: 'externalPage',
  WEB_PANEL: 'webPanel'
});


/** WEBPACK FOOTER **
 ** ./src/js/app/keys/integrations_keys.js
 **/