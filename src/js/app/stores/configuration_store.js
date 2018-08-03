import AppDispatcher from 'dispatchers/app_dispatcher';
import Store from 'lib/core/store';

class ConfigurationStore extends Store {

  registerListeners() {
    AppDispatcher.register('updated:config', (data) => {
      this.set(data);
    });
  }

  get(key) {
    switch(key) {
      case 'auth_method':
        return this._getAuthMethod();

      case 'client_node':
        return this._getClientNode();

      case 'bind_url':
        return this._getBindUrl();

      default:
        return super.get(key);
    }
  }

  _getBindUrl() {
    if (_.isString(this.data.bind_url) && _.isString(this.data.web_server) && this.data.bind_url.indexOf('https://') === -1) {
      this.data.bind_url = `https://${this.data.web_server}${this.data.bind_url}`;
    }
    return this.data.bind_url;
  }

  _getAuthMethod() {
    if (_.isNull(this.data.auth_method) && _.isString(this.data.oauth_token)) {
      this.data.auth_method = 'oauth2';
    }
    return this.data.auth_method;
  }

  _getClientNode() {
    if (_.isString(this.data.client_type) && _.isNull(this.data.client_node)) {
      let node = `http://hipchat.com/client/${this.data.client_type}`;
      if (this.data.client_subtype) {
        node += `/${this.data.client_subtype}`;
      }
      this.data.client_node = node;
    }
    return this.data.client_node;
  }

  getDefaults() {
    return {
      auth_method: null,
      auth_nonce: null,
      oauth_token: null,
      oauth_token_expires_in: null,
      apiv1_token: null,
      apiv1_token_expires_in: null,
      base_url: '',
      video_base_url: '',
      bind_url: null,
      api_host: 'api.hipchat.com',
      conference_server: null,
      chat_server: null,
      display_name: "",
      web_server: null,
      route: null,
      invite_url: null,
      video_chat_uri: null,
      client_type: null,
      client_subtype: null,
      client_version_id: null,
      client_os_version_id: null,
      client_node: null,
      asset_base_uri: null,
      video_chat_enabled: null,
      private_rooms_enabled: null,
      guest_access_enabled: null,
      html5_routing_enabled: null,
      ui: null,
      app_config_overrides: null,
      feature_flags: {},
      native_feature_flags: {},
      log_to_file: false,
      jid: null,
      sid: null,
      user_id: null,
      user_name: null,
      group_id: null,
      group_name: null,
      mention: null,
      is_admin: null,
      is_guest: null,
      guest_key: null,
      email: null,
      title: null,
      photo_small: null,
      photo_large: null,
      group_avatar_url: null,
      addlive_app_id: null
    };
  }

  /**
   * @method isOAuth
   * @returns {boolean} is the config in oauth2 mode
   */
  isOAuth() {
    return this._getAuthMethod() === 'oauth2';
  }

  /**
   * @method isNonce
   * @returns {boolean} is the config in nonce mode
   */
  isNonce() {
    return this._getAuthMethod() === 'nonce';
  }

  /**
   * @method getNonceToken
   * @returns {string} the nonce session token used for authenticating xmpp in nonce mode
   */
  getNonceToken() {
    return this.data.auth_nonce;
  }

  /**
   * @method getOAuthToken
   * @returns {string} the oauth token for authenticating with v2 (coral) apis
   */
  getOAuthToken() {
    return this.data.oauth_token;
  }

  /**
   * @method getOAuthTokenExpiry
   * @returns {number} in ms
   */
  getOAuthTokenExpiry() {
    return this.data.oauth_token_expires_in;
  }

  /**
   * @method getApiV1TokenExpiry
   * @returns {number} in ms
   */
  getApiV1TokenExpiry() {
    return this.data.apiv1_token_expires_in;
  }

  /**
   * Get session token used for authenticating to PHP/v1 api -- such as
   * for saving preferences and authenticating in-app search
   *
   * @method getApiV1Token
   * @returns {object} the session token object
   */
  getApiV1Token() {
    return this.data.apiv1_token;
  }

  /**
   * Get BOSH session id
   *
   * @method getSID
   * @returns {string} the BOSH session id
   */
  getSID() {
    return this.data.sid || "Unknown";
  }


  /**
   * @method isAdmin
   * @returns {boolean} is the current user an admin
   */
  isAdmin() {
    return this.data.is_admin === true;
  }

  /**
   * @method isGuest
   * @returns {boolean} is the current user a guest
   */
  isGuest() {
    return this.data.is_guest === true;
  }

  /**
   * @method shouldLogToFile
   * @returns {boolean} should the app send logs through the SPI
   */
  shouldLogToFile() {
    return this.data.log_to_file === true;
  }

}

export default new ConfigurationStore();


/** WEBPACK FOOTER **
 ** ./src/js/app/stores/configuration_store.js
 **/