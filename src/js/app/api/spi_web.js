import AppDispatcher from 'dispatchers/app_dispatcher';
import SPI from 'SpiBase';
import DialogActions from 'actions/dialog_actions';
import VideoWindow from 'models/video_window_model';
import VideoCallStrings from 'strings/video_call_strings';
import fileHelper from 'helpers/file_helper';
import utils from 'helpers/utils';

function SpiWeb () {}

SpiWeb.prototype = SPI.prototype;

SpiWeb.prototype.onNotification = function (notification) {
  this.notifier = this.notifier || require('helpers/notifier');
  this.notifier.notify(notification);
};

SpiWeb.prototype.onTotalUnreadCountUpdate = function (count, hasMention) {
  this.notifier = this.notifier || require('helpers/notifier');
  this.notifier.updateTotalUnreadCount(count, hasMention);
};

SpiWeb.prototype.getNotificationPermission = function () {
  if (typeof Notification !== 'undefined') {
    return Notification.permission !== 'default';
  }
};

SpiWeb.prototype.showPreferencesDialog = function() {
  DialogActions.showSettingDialog();
};

SpiWeb.prototype.onSignOut = function (hc, data) {
  var location = utils.getWindowLocation(),
      is_guest = (data.is_guest && data.guest_key),
      url = (is_guest) ? utils.urls.guestSignOut(data.guest_key) : utils.urls.signOut(),
      timeout = (is_guest) ? 1000 : 0;

  if (is_guest) {
    hc.leaveRoom(data.jid, data.type);
  }
  hc.terminateChatSession(false);

  setTimeout(function () {
    location.href = url;
  }, timeout);
};

SpiWeb.prototype.fetchPdfViewerResources = function (moduleName, baseUri) {
  let resources = {
        'pdf-viewer': baseUri + 'vendor/fileviewer-1.4.1/fileviewer-document.custom.min.js',
        'pdf-viewer-css': baseUri + 'vendor/fileviewer-1.4.1/fileviewer-document.custom.min.css'
      };

  function loadResource(name) {
    let el;

    if (name === 'pdf-viewer') {
      el = document.createElement('script');
      el.async = true;
      el.src = resources[name];

    } else if (name === 'pdf-viewer-css') {
      el = document.createElement('link');
      el.type = 'text/css';
      el.rel = 'stylesheet';
      el.href = resources[name];
    }

    document['head'].appendChild(el);

    return new Promise(function(resolve, reject) {
      el.onload = function() {
        resolve(el);
      };
      el.onerror = function(err) {
        reject(err);
      };
    });
  }

  return Promise.all([
    loadResource(moduleName),
    loadResource(moduleName + '-css')
  ]);
};

SpiWeb.prototype.onStropheAuthFailed = function (error) {
  AppDispatcher.dispatch('signout');
};

SpiWeb.prototype.onStrophePolicyViolation = (data) => {
  $(document).trigger("app-error", data);
};

SpiWeb.prototype.onReconnectionError = function (error) {
  AppDispatcher.dispatch('signout');
};

SpiWeb.prototype.onLogInToAnotherTeam = function() {
  return window.open('https://www.hipchat.com/sign_in', '_blank');
};

SpiWeb.prototype.openInternalWindow = function(...args) {
  return window.open(...args);
};

SpiWeb.prototype.openExternalWindow = function(...args) {
  return window.open(...args);
};

SpiWeb.prototype.downloadFile = function(url) {
  return fileHelper.downloadFileAtUrl(url);
};

SpiWeb.prototype.openExternalWindowWithPromise = function(promise) {
  // Prepare a new window before setting the location. This is used as a work-around for popup-blockers.
  let externalWindow = window.open('');

  return promise.then((url) => {
    externalWindow.location = url;
    return externalWindow;
  }).catch(() => {
    externalWindow.close();
  });
};

/**
 * Video Window
 */

SpiWeb.prototype.initializeVideoWindow = function (...args) {
  return new Promise((resolve, reject) => {
    try {
      resolve(new VideoWindow(...args));
    } catch (e) {
      reject(e);
    }
  });
};

SpiWeb.prototype.prepareVideoWindow = function (name, props) {
  try {
    let preppedWindow = window.open('', name, props);
    preppedWindow.document.write(`
      <body style="
        font-family: Helvetica Neue, Helvetica, Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        padding: 0;
        ">
        <p>${VideoCallStrings.connecting}</p>
      </body>`);
    return preppedWindow;
  } catch (e) {
    return false;
  }
};

SpiWeb.prototype.hasActiveVideoSession = function () {
  return new Promise(function (resolve) {
    resolve(false);
  });
};

SpiWeb.prototype.handleVideoCallInvite = function (answerCall, declineCall, data) {
  return false;
};

SpiWeb.prototype.dismissVideoCallInvite = function () {
  return false;
};

SpiWeb.prototype.onChangeUserStatus = function (status) {
  return false;
};

SpiWeb.prototype.onChangeActiveChat = function (isChat) {
  return false;
};

module.exports = new SpiWeb();



/** WEBPACK FOOTER **
 ** ./src/js/app/api/spi_web.js
 **/