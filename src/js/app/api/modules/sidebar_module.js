import IntegrationsActions from 'actions/integrations_actions';
import logger from 'helpers/logger';


export function openView(data, callback) {
  if (!data || !data.key) {
    logger.error("[HC-Integrations]", "No key specified. Use open({key: 'sidebar-key'}).");
    return;
  }
  IntegrationsActions.openSidebarView(callback._context.extension.addon_key, data.key, {
    options: data.options,
    parameters: data.parameters,
    urlTemplateValues: data.urlTemplateValues
  }, "api");
}

export function closeView() {
  IntegrationsActions.closeSidebarView("api");
}


/** WEBPACK FOOTER **
 ** ./src/js/app/api/modules/sidebar_module.js
 **/