var DialogActions = require('./dialog_actions'),
    SimpleXDM = require('simple-xdm/host'),
    AppDispatcher = require('dispatchers/app_dispatcher'),
    IntegrationDialogStore = require('stores/integration_dialog_store'),
    IntegrationEvents = require('api/api_integration_events');

module.exports = {

  update: function (dialog, origin) {
    AppDispatcher.dispatch('update-integration-dialog', {dialog, origin});
  },

  closeDialog: function(origin) {
    if (IntegrationDialogStore.isActiveDialogOwner(origin)) {
      DialogActions.closeDialog();
    }
  },

  _btnClickCallback: function (shouldSubmit) {
    if (shouldSubmit !== false) {
      DialogActions.closeDialog();
    }
  },

  buttonClick: function (integration, actionKey) {

    var dispatched = SimpleXDM.dispatch(IntegrationEvents.DIALOG_CLICK, {
      addon_key: integration.addon_key,
      key: integration.key
    }, {action: actionKey}, this._btnClickCallback);

    var filtered = [];
    if (dispatched) {
      filtered = dispatched.filter((extension) => {
        if (!extension.registered_events) {
          return false;
        }
        return extension.registered_events.indexOf(IntegrationEvents.DIALOG_CLICK) !== -1;
      });
    }

    if (filtered.length === 0) {
      DialogActions.closeDialog();
    }
  },

  filterChange: function (integration, value) {
    SimpleXDM.dispatch(IntegrationEvents.DIALOG_FILTER_CHANGED, {
      addon_key: integration.addon_key,
      key: integration.key
    }, { value });
  }

};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/integration_dialog_actions.js
 **/