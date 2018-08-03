/*global ENV*/
import link_utils from 'helpers/link_utils';

class HCGlobal {

  constructor(data) {
    if (data) {
      this.buildForHC(data);
    }
    this.Actions = require('actions');
    this.AppDispatcher = require('dispatchers/app_dispatcher');
    this.AnalyticsDispatcher = require('dispatchers/analytics_dispatcher');
    this.ApplicationStore = require('stores/application_store');
    this.AppConfig = require('config/app_config');
    this.utils = require('helpers/utils');
    this.Emoticons = require('helpers/emoticons');
    this.Rehacked = require('helpers/experiment_registry');
    this.ENV = ENV;
    this.api = require('api/api');
    this.resolution = Math.ceil(window.devicePixelRatio);
    this.emoticon_resolution_helper = function (img) {
      img.onerror = null;
      img.src = link_utils.remove_resolution(img.src);
    };

    if (ENV !== 'production') {
      this.DAL = require('core/dal');
    }
  }

  buildForHC(data) {
    _.forOwn(data, (value, key) => {
      this[key] = value;
    });
  }

}

module.exports = HCGlobal;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/hc_global.js
 **/