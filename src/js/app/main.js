/*global HC_WEB_BASEURL, VERSION_ID*/

(function() {
  var HipChatClient = require('./hipchat-client/client');
  var utils = require('helpers/utils');

  var $body = $('body');

  var client = new HipChatClient({
    el: document.getElementById('hipchat'),
    base_url: HC_WEB_BASEURL,
    client_type: 'web',
    client_version_id: VERSION_ID,
    client_os_version_id: [utils.browser.userAgent().browser.name || 'unknown', utils.browser.userAgent().browser.major || 1].join(" "),
    asset_base_uri: window.assetBaseUri,
    is_guest: !!(window.HC && window.HC.is_guest),
    html5_routing_enabled: true,
    initState: $body.data('init-state'),
    feature_flags: $body.data('feature-flags')
  });
  $body.removeAttr('data-init-state data-feature-flags').removeData(['initState', 'featureFlags']);
  client.render();
})();



/** WEBPACK FOOTER **
 ** ./src/js/app/main.js
 **/