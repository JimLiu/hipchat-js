import IntegrationsStore from 'stores/integrations_store';
import logger from 'helpers/logger';

export default function scopedAPIMethod(scope, method) {
  return function (callback) {
    let call_context = _.last(arguments);
    let addon_key = _.get(call_context, "_context.extension.addon_key");

    if (addon_key) {
      let scopes = IntegrationsStore.getScopesForAddon(addon_key);

      if (_.includes(scopes, scope)) {
        let error = null, returnValue = null;
        try {
          returnValue = method(_.slice(arguments, 0, arguments.length - 1));

        } catch (ex) {
          error = ex.message;
          logger.error("[HC-Integrations]", `Error executing API method - ${ex}.`);
        }

        call_context(error, returnValue);
      } else {
        let error = `Error executing API method - insufficient scopes, needed ${scope} have ${scopes}.`;
        call_context(error);
        logger.error("[HC-Integrations]", error);
      }
    } else {
      let error = `Error executing API method - could not find addon information for call.`;
      call_context(error);
      logger.error("[HC-Integrations]", error);
    }
  };
}


/** WEBPACK FOOTER **
 ** ./src/js/app/api/modules/scoped_api.js
 **/