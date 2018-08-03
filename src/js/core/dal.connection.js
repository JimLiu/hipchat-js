import ConnectionManager from './xmpp/connection_manager';
import utils from 'helpers/utils';

/**
 * @module DALConnection
 */
const DALConnection = {

  /**
   * Gets the time remaining that we are still able recover the session in.
   *
   * @method getSessionRecoveryTime
   * @returns {number}
   */
  getSessionRecoveryTime() {
    return ConnectionManager.Connection.allowedInactivityInterval - (utils.now() - ConnectionManager.Connection.last_BOSH_activity);
  }

};

export default DALConnection;


/** WEBPACK FOOTER **
 ** ./src/js/core/dal.connection.js
 **/