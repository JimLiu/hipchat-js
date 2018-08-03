/**
 * @typedef {{name: string, key: string}} AnalyticsEventKeys
 * @type {Object.<string, string>}
 */
const AnalyticsEventKeys = Object.freeze({
  AUTH: "hipchat.client.app.perf.auth.server",
  BROWSER_METRICS: "browser.metrics.app",
  CLIENT_CURRENT: "hipchat.client.current",
  CLIENT_LAUNCH: "hipchat.client.launch",
  CLIENT_READY: "hipchat.client.ready",
  CLIENT_READY_FOR_USER: "hipchat.client.app.perf.load.ready",
  CONNECTION_ESTABLISHED: "hc_web.hcjsclient.initial.connection.established",
  DOM_READY: "hipchat.client.app.perf.nav.timing.dom",
  INITIAL_EMOTICONS: "hipchat.client.app.perf.emoticons.initial.server",
  INITIAL_FETCH: "hc_web.hcjsclient.initial.data.fetch",
  INITIAL_IQ: "hipchat.client.app.perf.iq.initial.server",
  INITIAL_PRESENCE: "hipchat.client.app.perf.presence.initial.server",
  INITIAL_ROOMS: "hipchat.client.app.perf.rooms.initial.server",
  INITIAL_ROSTER: "hipchat.client.app.perf.roster.initial.server",
  CHAT_SENDABLE: "hipchat.client.app.perf.user.chat-sendable",
  CHAT_IS_COMPLETE: "hipchat.client.app.perf.user.chat-is-complete",
  LAUNCH_TO_ACTIVE_CHAT_LIST: "hipchat.client.app.perf.user.launch-to-active-chat-list",
  LAUNCH_TO_CHAT: "hipchat.client.app.perf.user.launch-to-chat",
  LAUNCH_TO_CHAT_COMPLETE: "hipchat.client.app.perf.user.launch-to-chat-complete",
  LOBBY_RENDER: "hipchat.client.app.perf.lobby.panel.render",
  PRODUCT: "HipChat",
  RECONNECTION: "hc_web.hcjsclient.reconnection",
  ROOM_FILES_LOAD: "hipchat.client.app.perf.room.files.load.server",
  ROOM_HISTORY_LOAD: "hipchat.client.app.perf.room.history.load.server",
  ROOM_MEMBERS_LOAD: "hipchat.client.app.perf.room.members.load.server",
  ROOM_RENDER: "hipchat.client.app.perf.room.render"
});
export default AnalyticsEventKeys;


/** WEBPACK FOOTER **
 ** ./src/js/app/keys/analytics_event_keys.js
 **/