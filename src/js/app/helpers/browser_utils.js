import clientSubTypeKeys from 'keys/client_subtype_keys';
import browserFamilies from 'keys/browser_family_keys';
import userAgentParser from 'ua-parser-js';

var browser = {
  is: {
    ie_edge: () => {
      return _.includes(navigator.userAgent, 'Edge');
    },
    ie: () => {
      return _.includes(navigator.userAgent, 'MSIE') || _.includes(navigator.appVersion, 'Trident/');
    },
    safari: () => {
      return _.includes(navigator.userAgent, 'Safari') && !browser.is.chrome();
    },
    chrome: () => {
      return _.includes(navigator.userAgent, 'Chrome') && !browser.is.ie_edge();
    },
    firefox: () => {
      return _.includes(navigator.userAgent, 'Firefox') && !browser.is.ie_edge();
    }
  },

  family: () => {
    let family = browserFamilies.UNKNOWN;

    if (browser.is.ie()) {
      family = browserFamilies.IE;
    } else if (browser.is.ie_edge()) {
      family = browserFamilies.EDGE;
    } else if (browser.is.safari()) {
      family = browserFamilies.SAFARI;
    } else if (browser.is.chrome()) {
      family = browserFamilies.CHROME;
    } else if (browser.is.firefox()) {
      family = browserFamilies.FIREFOX;
    }

    return family;
  },

  userAgent() {
    if (!browser._userAgent){
     browser._userAgent = userAgentParser();
    }
    return browser._userAgent;
  }
};

var platform = {
  isMac(pltfrm = false) {
    return platform._checkPlatform('MAC', pltfrm);
  },

  isWindows(pltfrm = false) {
    return platform._checkPlatform('WIN', pltfrm);
  },

  isLinux(pltfrm = false) {
    return platform._checkPlatform('LINUX', pltfrm);
  },

  _checkPlatform(check, pltfrm) {
    if (!pltfrm){
      pltfrm = navigator.platform;
    }
    return pltfrm.toUpperCase().indexOf(check) !== -1;
  }
};

var clientSubType = {
  isNative: function (client_subtype) {
    return clientSubType.isMac(client_subtype) || clientSubType.isQT(client_subtype);
  },

  isQT: function (client_subtype) {
    return clientSubType.isWindows(client_subtype) || clientSubType.isLinux(client_subtype) || clientSubType.isQTMac(client_subtype);
  },

  isWindows: function (client_subtype) {
    return client_subtype === clientSubTypeKeys.QT_WINDOWS;
  },

  isQTMac: function (client_subtype) {
    return client_subtype === clientSubTypeKeys.QT_MAC;
  },

  isLinux: function (client_subtype) {
    return client_subtype === clientSubTypeKeys.QT_LINUX;
  },

  isMac: function (client_subtype) {
    return client_subtype === clientSubTypeKeys.MAC_NATIVE;
  }
};

export default browser;
export { platform, clientSubType };



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/browser_utils.js
 **/