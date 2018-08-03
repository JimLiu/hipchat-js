import AnalyticsActions from 'actions/analytics_actions';
import ConfigStore from 'stores/configuration_store';
import DialogActions from 'actions/dialog_actions';
import IntegrationHelper from 'helpers/integration_helper';
import IntegrationsActions from 'actions/integrations_actions';
import logger from 'helpers/logger';
import RouteActions from 'actions/route_actions.js';
import URI from 'helpers/uri';

function parseOptions(options) {
  if (_.isString(options) && !_.isEmpty(options)) {
    try {
      options = JSON.parse(options);
    } catch (error) {
      logger.error('[ChatPanel:routeLinkAction]', 'target options are not valid JSON', error.message);
      options = {};
    }
  }
  return options || {};
}

function handleTarget(message, target, targetOptions) {
  let targetModule = IntegrationHelper.split_full_key(target);
  let data = targetOptions;
  if (message) {
    let parameters = IntegrationHelper.extractIntegrationParametersFromMessage(message);
    data = _.extend({urlTemplateValues: {message: parameters}, parameters: parameters}, targetOptions);
  }

  let sender = message.notification_sender;
  if (sender && sender.type === "addon") {
    if (targetModule.length === 2) {
      if (sender.id === targetModule[0]) {
        IntegrationsActions.open(targetModule[0], targetModule[1], data, null, "link");
      } else {
        logger.error('[HC-Integrations]', `Unable to invoke action for '${targetModule[0]}' from plugin '${sender.id}'`);
      }
    } else if (targetModule.length === 1) {
      IntegrationsActions.open(sender.id, targetModule[0], data, null, "link");
    }
    else {
      logger.error('[HC-Integrations]', `Unknown link target from notification: '${target}'`);
    }
  } else {
    logger.error('[HC-Integrations]', `Unable to invoke action link - message not sent from addon: '${target}'`);
  }
}

export default {

  handleNotificationLink: function (dataTarget, dataTargetOptions, href, message) {

    let targetUrl = URI.parse(href);
    let targetOptions = parseOptions(dataTargetOptions);
    let isLegacyConnectDialog = (dataTarget === 'dialog');

    if (targetUrl && isLegacyConnectDialog) {

      AnalyticsActions.connectDialogLinkClickedEvent(targetUrl.getDomain());

      DialogActions.showAddonDialog({
        addon_key: targetUrl.getDomain(),
        module_key: 'module-key',
        addon_url: href,
        addon_options: targetOptions
      });

      return true;
    }

    if (targetUrl && targetUrl.isHipchatNative(ConfigStore.get('base_url'))) {

      if (targetUrl.containsRoom()) {
        RouteActions.selectRoom(targetUrl.getRoom(), true);
      } else if (targetUrl.containsUser()) {
        RouteActions.selectOTO(targetUrl.getUser(), true);
      } else {
        logger.error('[HC-Integrations], `malformed native link`');
      }

      let target = targetUrl.getParameterValue('target');
      if (target || dataTarget) {
        handleTarget(message, target || dataTarget, targetOptions);
      }
      return true;
    }

    if (dataTarget) {
      handleTarget(message, dataTarget, targetOptions);
      return true;
    }

    return false;
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/integration_link_helper.js
 **/