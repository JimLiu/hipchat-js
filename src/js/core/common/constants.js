export const HEARTBEAT_INTERVAL = 60 * 1000;
export const XMPP_INACTIVITY_INTERVAL = 60 * 1000;
export const BOSH_INACTIVITY_INTERVAL = 60 * 1000;
export const XMPP_PONG_WAIT = 30 * 1000;
export const NETWORK_LATENCY_GRACE_PERIOD = 5 * 1000;

export const RECONNECT_BACKOFF_FACTOR = 3;
export const RECONNECT_DELAY_MS = 2 * 1000;
export const RECONNECT_MAX_DELAY = 60 * 1000;
export const RECONNECT_SYNC_THRESHOLD = 3 * 60 * 1000;
export const MAX_RECONNECT_TIME = 10 * 60 * 1000;
export const IDLE_DELAY_MINUTES = 15;

export const OAUTH_TOKEN_REFRESH_DELAY_MS = 5000;
export const OAUTH_TOKEN_REFRESH_BACKOFF_FACTOR = 3;
export const OAUTH_TOKEN_REFRESH_MAX_DELAY = 60 * 1000;

export const CACHE_TTL = 90 * 24 * 60 * 60 * 1000;
export const OAUTH_TTL = 60 * 60 * 1000;
export const SLEEP_DELAY_MS = 60 * 1000;

export const READSTATE_BACKOFF_FACTOR = 3;
export const READSTATE_DEFAULT_BACKOFF = 5 * 1000;
export const READSTATE_MAX_BACKOFF = 5 * 60 * 1000;
export const READSTATE_UPDATE_DEBOUNCE = 0.5 * 1000;
export const READSTATE_NULL_MID = '';
export const READSTATE_NULL_TS = '0.0';

export const SYNC_REQUEST_GZIP_SIZE = 10 * 1024;

export const XMPP_LOG_MAX_CHARS = 600;

export const XMPP_SEND_IQ_TIMEOUT = 30000;


/** WEBPACK FOOTER **
 ** ./src/js/core/common/constants.js
 **/