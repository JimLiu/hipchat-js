import AppDispatcher from 'dispatchers/app_dispatcher';
import DialogActions from 'actions/dialog_actions';
import logger from 'helpers/logger';
import spi from 'spi';
import IntegrationHelper from 'helpers/integration_helper';
import IntegrationsStore from 'stores/integrations_store';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import IntegrationsViewActions from 'actions/integrations_view_actions';
import {RECEIVE_PARAMETERS} from 'api/api_integration_events';

module.exports = {

  invokeAction(action, data = {}) {
    AnalyticsDispatcher.dispatch('analytics-event', {
      name: "hipchat.client.integrations.action.invoke",
      properties: {
        addon_key: action.addon_key,
        action_key: action.full_key,
        target_key: action.target.key
      }
    });

    if (data.msg && data.msg.file_data && data.msg.file_data.is_authenticated && !data.msg.file_data.fetched_url) {
      AppDispatcher.dispatch('API:fetch-signed-file', data.msg.file_data, (response) => {
        data.msg.file_data.fetched_url = response.temp_url;
        return this._initOpen(action, data);
      });
    } else {
      return this._initOpen(action, data);
    }
  },

  _initOpen(action, data) {
    let msg = _.cloneDeep(data.msg);

    if (msg && msg.file_data && msg.file_data.fetched_url) {
      msg.file_data.url = msg.file_data.fetched_url;
    }

    let parameters = IntegrationHelper.extractIntegrationParametersFromMessage(msg);

    return this.open(action.addon_key, action.target.key, {
      event: action.key,
      parameters: parameters,
      urlTemplateValues: {
        message: parameters
      }
    });
  },

  openDialog(addonKey, moduleKey, data = {}, source = "") {
    return this.open(addonKey, moduleKey, data, ['dialog'], source);
  },

  openSidebarView(addonKey, moduleKey, data = {}, source = "") {
    return this.open(addonKey, moduleKey, data, ['webPanel', 'glance'], source);
  },

  openExternalPage(addonKey, moduleKey, data = {}, source = "") {
    return this.open(addonKey, moduleKey, data, ['externalPage'], source);
  },

  closeSidebarView(source = "") {
    AppDispatcher.dispatch('show-sidebar-integration', {
      activeIntegration: null
    });

    AnalyticsDispatcher.dispatch('analytics-event', {
      name: "hipchat.client.integrations.action.close.view",
      properties: {
        source: source
      }
    });
  },

  /**
   * @param {string} addonKey The add-on key
   * @param {string} moduleKey The module  key
   * @param {Object} data An object with three optional properties:
   *     {
   *       "options": { <dialog options to customize a dialog target> },
   *       "urlTemplateValues": { <key/value pairs for url template substitution> },
   *       "parameters": { <arbitrary data to be passed to the add-on through an event> }
   *     }
   * @param {Array.<string>} expectedTypes null for any type, or an array of the allowed module types
   * @param {string} source The 'source' property in the analytics events
   * @returns {boolean} True if successful, false otherwise
   */
  open(addonKey, moduleKey, data = {}, expectedTypes = null, source = "") {

    let targetKey = IntegrationHelper.to_full_key(addonKey, moduleKey);
    var target = IntegrationsStore.getExtensionByKey(targetKey);

    if (!target) {
      target = IntegrationsStore.getInternalExtensionByKey(targetKey);
    }

    if (!target) {
      logger.error('[HC-Integrations]', `Unknown action target: ${targetKey}`);
      return false;
    }

    if (expectedTypes && !_.includes(expectedTypes, target.type)) {
      logger.error('[HC-Integrations]', `The target ${targetKey} is not in allowed types. Expected: ${expectedTypes}`);
      return false;
    }

    let activeChat = IntegrationsStore.get('active_chat');

    switch (target.type) {
      case 'webPanel':
        this._dispatchAnalyticEvent("hipchat.client.integrations.action.open.view", target, source);
        return this._openSidebarView(target, data, activeChat.id);
      case 'glance':
        if(_.isString(target.target)) {
          this._dispatchAnalyticEvent("hipchat.client.integrations.action.open.glance", target, source);
          return this._openGlance(target, data, activeChat.id);
        }
        logger.error('[HC-Integrations]', 'Cannot open a glance that does not have a target attribute', target.full_key);
        this._dispatchAnalyticEvent("hipchat.client.integrations.action.open.unsupported.type", target, source);
        return false;
      case 'dialog':
        this._dispatchAnalyticEvent("hipchat.client.integrations.action.open.dialog", target, source);
        return this._openDialog(target, data, activeChat.id);
      case 'externalPage':
        this._dispatchAnalyticEvent("hipchat.client.integrations.action.open.external.page", target, source);
        return this._openExternalPage(target, data, activeChat.id);
      default:
        logger.error('[HC-Integrations]', 'Unsupported target type', target.type);
        this._dispatchAnalyticEvent("hipchat.client.integrations.action.open.unsupported.type", target, source);
        return false;
    }
  },

  focusChatText() {
    AppDispatcher.dispatch('application-focused');
  },

  _dispatchAnalyticEvent(name, target, source) {
    AnalyticsDispatcher.dispatch('analytics-event', {
      name: name,
      properties: {
        addon_key: target.addon_key,
        full_key: target.full_key,
        source: source
      }
    });
  },

  _openSidebarView(webPanel, data, room_id) {
    IntegrationsViewActions.fetchSignedUrlConditionally(webPanel, room_id, data.urlTemplateValues);
    this._showIntegrationView(webPanel.full_key, data.glance_key, data);
    return true;
  },

  _openGlance(glance, data) {
    let targetKey = _.isString(glance.target) ? glance.target : glance.target.key;

    // Special treatment for internal Files and Links glances
    var fullTargetKey = IntegrationHelper.to_full_key(glance.addon_key, targetKey);
    if (IntegrationsStore.getInternalExtensionByKey(fullTargetKey)) {
      return this._showIntegrationView(fullTargetKey, glance.full_key, data);
    }

    let targetData = _.extend({glance_key: glance.full_key}, data);
    return this.open(glance.addon_key, targetKey, targetData, ['webPanel', 'dialog', 'externalPage']);
  },

  _openDialog(dialog, data, room_id) {
    var customizedDialog = dialog;
    if (data.options) {
      customizedDialog = _.merge({}, dialog, {
        title: data.options.title,
        options: data.options.options
      });
    }

    logger.info('[HC-Integrations]', 'Rendering dialog', customizedDialog);

    let url_template_values = this._getUrlTemplateValues(data);
    let init_event = this._createInitEvent(data);

    IntegrationsViewActions.fetchSignedUrlConditionally(dialog, room_id, url_template_values);

    DialogActions.showIntegrationDialog({
      room_id: room_id,
      integration: customizedDialog,
      init_event: init_event
    });

    AnalyticsDispatcher.dispatch('analytics-show-dialog', {
      key: dialog.full_key
    });
    return true;
  },

  _openExternalPage(externalPage, data, room_id) {
    let promise = new Promise((resolve, reject) => {
      IntegrationsViewActions.fetchSignedUrlWithResult(externalPage, room_id, data.urlTemplateValues,
        (response_data, headers) => {
          if (response_data && !response_data.error && headers.status < 400) {
            resolve(response_data.location);
          } else {
            logger.error('[HC-Integrations]', `Error while fetching signed url (${headers.status})`, response_data);
            reject();
          }
        }
      );
    });

    spi.openExternalWindowWithPromise(promise);

    AnalyticsDispatcher.dispatch('analytics-show-external-page', {
      key: externalPage.full_key
    });
    return true;
  },

  _showIntegrationView(key, glance_key, data) {
    let url_template_values = this._getUrlTemplateValues(data);
    let init_event = this._createInitEvent(data);

    AppDispatcher.dispatch('show-sidebar-integration', {
      activeIntegration: {key, glance_key, url_template_values, init_event}
    });

    let addon_key = IntegrationHelper.split_full_key(key)[0];
    AnalyticsDispatcher.dispatch('analytics-event', {
      name: "hipchat.client.integrations.sidebar.show.view",
      properties: {
        addon_key: addon_key,
        full_key: key,
        glance_key: glance_key
      }
    });
    return true;
  },

  _createInitEvent(data) {
    let initEvent = null;
    if (_.has(data, 'parameters')) {
      initEvent = {
        event: data.event || RECEIVE_PARAMETERS,
        parameters: data.parameters
      };
    }
    return initEvent;
  },

  _getUrlTemplateValues(data) {
    let urlTemplateValues = null;
    if (_.has(data, 'urlTemplateValues')) {
      urlTemplateValues = data.urlTemplateValues;
    }
    return urlTemplateValues;
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/integrations_actions.js
 **/