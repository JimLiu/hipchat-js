import AppConfig from 'config/app_config';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import ApplicationStore from 'stores/application_store';
import URI from 'helpers/uri';

function objectToQueryParams(params) {
  let url = '';

  Object.keys(params).forEach(function(key){
    url += key + '=' + encodeURIComponent(params[key]) + '&';
  });

  return url.substring(0, url.length - 1);
}

//TODO: this probably should be an action
function callAnalytics (event, params){
  if (typeof params !== 'undefined') {
      AnalyticsDispatcher.dispatch("analytics-connect-event", params);
  }
}

module.exports = {
  bindAnalyticsIntercept() {
    if (AJS && typeof AJS.bind === 'function') {
      AJS.bind('analyticsEvent', callAnalytics);
    }
  },
  unbindAnalyticsIntercept() {
    if (AJS && typeof AJS.unbind === 'function') {
      AJS.unbind('analyticsEvent', callAnalytics);
    }
  },
  getCapabilities() {
    return {
      hostlib: 'https://' + ApplicationStore.get('web_server') + '/min/?b=js&f=connect/all-debug.js,connect/plugin-init.js'
    };
  },
  getIframeUrl(src, namespace, additionalCapabilties, ...additionalParams) {

    let uri = URI.parse(window.location.href);
    let params = {
      'xdm_e': uri.getBase(),
      'xdm_c': 'channel-' + namespace,
      'cp': '',
      'lic': 'none',
      'embedded': true
    },
    capabilities = $.extend({}, this.getCapabilities(), additionalCapabilties),
    iframeUrl = `${src}${(_.includes(src, '?') ? '&' : '?')}${objectToQueryParams(params)}#${JSON.stringify(capabilities)}`;

    return iframeUrl;
  },
  getNamespace(addon_key, module_key) {
    return addon_key + '__' + module_key;
  },
  getDocumentHeight() {
    return $(document).height();
  },
  dialog: {
    getMaxWidth: function () {
      var documentWidth = $(document).width();
      return documentWidth - Math.min(120, (documentWidth / 100) * 10);
    },
    getMaxHeight: function (chrome) {
      var maxHeight = module.exports.getDocumentHeight();
      if(chrome){
        maxHeight -= AppConfig.connect_aui_dialog_chrome_height;
      }
      return maxHeight - Math.min(60, (maxHeight / 100) * 10);
    },
    capabilities: {
      resize: {},
      close: {}
    }
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/connect_addon.js
 **/