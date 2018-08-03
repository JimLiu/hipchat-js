import TokenCache from 'helpers/integrations_token_cache';
import HCAPI from 'api/api';
import logger from 'helpers/logger';

export function withToken(callback) {
  let extension = callback._context.extension;
  let roomId = HCAPI.getActiveChat().id;
  TokenCache.getToken(extension, roomId)
    .then(jwt => {
      callback(null, jwt.getToken());
    })
    .catch(err => {
      logger.error('[HC-Integrations]', `Unable to create token for '${extension.full_key}' in room ${roomId}`, err);
      callback({message: 'Unable to create token'});
    });
}


/** WEBPACK FOOTER **
 ** ./src/js/app/api/modules/auth_module.js
 **/