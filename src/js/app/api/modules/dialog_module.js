import IntegrationDialogActions from 'actions/integration_dialog_actions';
import IntegrationsActions from 'actions/integrations_actions';
import logger from 'helpers/logger';

export function open(data, callback) {
  if (!data || !data.key) {
    logger.error("[HC-Integrations]", "No key specified. Use open({key: 'dialog-key'}).");
    return;
  }
  IntegrationsActions.openDialog(callback._context.extension.addon_key, data.key, {
    options: data.options,
    parameters: data.parameters,
    urlTemplateValues: data.urlTemplateValues
  }, "api");
}

export function update(data, callback) {
  IntegrationDialogActions.update(data, callback._context.extension.addon_key);
}

export function updatePrimaryAction(primaryAction, callback) {
  IntegrationDialogActions.update({
    options: {
      primaryAction: primaryAction
    }
  }, callback._context.extension.addon_key);
}

export function close(callback) {
  IntegrationDialogActions.closeDialog(callback._context.extension.addon_key);
}



/** WEBPACK FOOTER **
 ** ./src/js/app/api/modules/dialog_module.js
 **/