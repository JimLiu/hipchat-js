import {URI as CajaURI} from 'sanitizer/lib/uri';

class URI {

  /**
   * Returns the scheme of a URI without parsing the URI, e.g. for URI templates and similar.
   * This method is here for backward compatibility and URI.parse(uri).getScheme() should be used for new code.
   * @param {string} uri The raw URI
   * @returns {string} The scheme of the URI, e.g. 'https' for 'https://example.com'
   */
  static getProtocol(uri) {
    let parts = uri.split(':');
    return parts.length > 0 ? parts[0] : '';
  }

  /**
   * Parses a URI
   * @param {string} uri The raw URI
   * @returns {URI|null} The URI or null, if 'uri' does not parse.
   */
  static parse(uri) {
    let parsed = CajaURI.parse(uri);
    return parsed ? new URI(parsed) : null;
  }

  constructor(cajaUri) {
    this.uri = cajaUri;
  }

  /**
   * Checks if a URI matches the native HipChat URI scheme: hipchat://www.hipchat.com/room/123.
   * The host part must be 'www.hipchat.com' or match the base URL of the HC Server.
   * @returns {boolean} true if it matches, false otherwise
   */
  isHipchatNative(baseUrl) {
    let base = CajaURI.parse(baseUrl);
    let host = this.uri.getDomain();
    return "hipchat" === this.uri.getScheme() && ("www.hipchat.com" === host || base.getDomain() === host);
  }

  /**
   * Returns the room ID or name for HipChat native URIs
   * @returns {string|null} null if the URI is not a native URI or does not point to a room. Returns the room ID or name
   */
  getRoom() {
    return this._nativePathElement('room');
  }

  /**
   * Checks whether the URI is a HipChat native URI and points to a room
   * @returns {boolean} true if it points to a room, false otherwise
   */
  containsRoom() {
    return this.getRoom() !== null;
  }

  /**
   * Returns the user ID, @mention or email for HipChat native URIs
   * @returns {string|null} null if the URI is not a native URI or does not point to a user;
   */
  getUser() {
    return this._nativePathElement('user');
  }

  /**
   * Checks whether the URI is a HipChat native URI and points to a user
   * @returns {boolean} true if it points to a user, false otherwise
   */
  containsUser() {
    return this.getUser() !== null;
  }

  /**
   * Returns the base URI, e.g. 'https://example.com' for 'https://example.com/path/?q=query
   * @returns {string} the base URI
   */
  getBase() {
    let baseUri = CajaURI.create(this.uri.getScheme(), this.uri.getCredentials(), this.uri.getDomain(), this.uri.getPort());
    return baseUri.toString();
  }

  /**
   * @returns {string} The scheme of the URI, e.g. 'https' for 'https://example.com'
   */
  getScheme() {
    return this.uri.getScheme();
  }

  /**
   * @returns {boolean} whether the URI has a scheme
   */
  hasScheme() {
    return this.uri.hasScheme();
  }

  /**
   * @returns {string} The decoded domain of the URI, e.g. 'example.com' for 'https://example.com:80'
   */
  getDomain() {
    return this.uri.getDomain();
  }

  /**
   * @returns {boolean} whether the URI has a domain
   */
  hasDomain() {
    return this.uri.hasDomain();
  }

  /**
   * @returns {string} The port of the URI, e.g. '80' for 'https://example.com:80'
   */
  getPort() {
    return this.uri.getPort();
  }

  /**
   * @returns {boolean} whether the URI has a port
   */
  hasPort() {
    return this.uri.hasPort();
  }

  /**
   * @returns {string} The decoded path of the URI, e.g. '/path' for 'https://example.com/path'
   */
  getPath() {
    return this.uri.getPath();
  }

  /**
   * @returns {boolean} whether the URI has a path
   */
  hasPath() {
    return this.uri.hasPath();
  }

  /**
   * @returns {string} The decoded query of the URI, e.g. '?q=query' for 'https://example.com/path?q=query'
   */
  getQuery() {
    return this.uri.getQuery();
  }

  /**
   * @returns {boolean} whether the URI has a query
   */
  hasQuery() {
    return this.uri.hasQuery();
  }

  /**
   * @returns {string} The decoded fragment of the URI, e.g. 'frag' for 'https://example.com/path#frag'
   */
  getFragment() {
    return this.uri.getFragment();
  }

  /**
   * @returns {boolean} whether the URI has a fragment
   */
  hasFragment() {
    return this.uri.hasFragment();
  }

  /**
   * Returns all query parameters as an array of keys and values like [ key0, value0, key1, value1, ... ]
   * @returns {Array.<string>}
   */
  getAllParameters() {
    return this.uri.getAllParameters();
  }

  /**
   * Returns the decoded values of a particular query parameter. E.g. ['a','b'] for 'q' where the query is '?q=a&q=b'
   * @param paramNameUnescaped the name of the query parameter (not escaped)
   * @returns {Array.<string>}
   */
  getParameterValues(paramNameUnescaped) {
    return this.uri.getParameterValues(paramNameUnescaped);
  }

  /**
   * Returns a map of non-empty lists for the query parameters. E.g. {x:['a'],y:['b']} for '?x=a&y=b'
   * @returns {Object.<string, Array.<string>>}
   */
  getParameterMap() {
    return this.uri.getParameterMap();
  }

  /**
   * Returns the first value for a given query parameter or null if the given
   * parameter name does not appear in the query string.
   * If the given parameter name does appear, but has no '=' following
   * it, then the empty string will be returned.
   * @param paramNameUnescaped the name of the query parameter (not escaped)
   * @returns {string|null}
   */
  getParameterValue(paramNameUnescaped) {
    return this.uri.getParameterValue(paramNameUnescaped);
  }

  /**
   * Sets the value(s) of query parameter
   * @param {string} key The query parameter key
   * @param {string|Array.<string>} values The value or values of the query parameter
   */
  setParameterValues(key, values) {
    this.uri.setParameterValues(key, _.isArray(values) ? values : [values]);
    return this;
  }

  /**
   * Removes a query parameter
   * @param {string} key
   */
  removeParameter(key) {
    this.uri.removeParameter(key);
    return this;
  }

  /**
   * @param {string} fragment the url fragment
   * @returns {string} The decoded fragment of the URI, e.g. 'frag' for 'https://example.com/path#frag'
   */
  setFragment(fragment) {
    if (_.isObject(fragment)) {
      let parts = [];
      for (let key in fragment) {
        parts.push(key + '=' + fragment[key]);
      }
      fragment = parts.join('&');
    }
    this.uri.setRawFragment(fragment);
    return this;
  }

  /**
   * Get the string representation of the URI
   * @returns {string}
   */
  toString() {
    let uri = this.uri.toString();
    return _.endsWith(uri, '?') ? uri.substr(0, uri.length - 1) : uri;
  }

  _nativePathElement(context) {
    let pathElements = this.uri.getPath().split('/');
    if (pathElements.length === 3 && pathElements[1] === context) {
      return pathElements[2];
    }
    return null;
  }
}

export default URI;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/uri.js
 **/