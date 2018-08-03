
let ReadStateError = {

  // The browser or native wrapper is (or at least think it is) offline.
  OFFLINE: 'offline',

  // HTTP 401 - User is not authorized to make requests to the API.
  // The client should retry the request once a new oauth token is received.
  UNAUTHORIZED: 'unauthorized',

  // HTTP 404 - The readstate feature is not enabled for the user's group.
  // The client should stop trying to update readstate until reconnect.
  DISABLED: 'disabled',

  // HTTP 429 - The client has made too many API requests in a set timeframe.
  // The client should schedule a retry for when the rate limit gets reset.
  RATE_LIMITED: 'rateLimited',

  // HTTP 4XX - The client is making a bad request.
  // The client is attempting to send data that does not conform to the
  // server spec, and should stop trying to update readstate.
  BAD_REQUEST: 'badRequest',

  // HTTP 0 - Request was unsuccessful because the request timed out or
  // because the browser might be offline.
  // HTTP 5XX - Server is not accepting readstate updates at this time.
  // This may be due to too much load. So the client should continue
  // to retry this request, but backoff up to a maximum.
  UNAVAILABLE: 'unavailable',


  handleRequestErrors(status) {
    var err = null;

    if (status === 401) {
      return ReadStateError.UNAUTHORIZED;
    } else if (status === 404) {
      return ReadStateError.DISABLED;
    } else if (status === 429) {
      return ReadStateError.RATE_LIMITED;
    } else if (status >= 400 && status < 500) {
      return ReadStateError.BAD_REQUEST;
    } else if (!status || status >= 500) {
      return ReadStateError.UNAVAILABLE;
    }

    return err;
  }

};

export default ReadStateError;



/** WEBPACK FOOTER **
 ** ./src/js/core/rest/readstate/readstate_error.js
 **/