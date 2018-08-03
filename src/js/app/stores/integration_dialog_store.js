import Store from 'lib/core/store';
import AppDispatcher from 'dispatchers/app_dispatcher';
import DialogActions from 'actions/dialog_actions';
import ModalDialogStore from 'stores/modal_dialog_store';
import IntegrationStore from 'stores/integrations_store';
import {event_names as integrations_event_names} from 'keys/integrations_keys';

class IntegrationDialogStore extends Store {

  constructor() {
    super();
    this.local = {
      active_chat: ''
    };
  }

  getDefaults() {
    return {
      title: "",
      options: {}
    };
  }

  registerListeners() {
    AppDispatcher.register({
      'update-integration-dialog': data => {
        let dialog = this.getAll();
        if (!data.origin || dialog.addon_key === data.origin) {
          let customizedDialog = _.merge({title: "", options: {}}, dialog, {
            title: data.dialog.title,
            options: data.dialog.options
          });
          this.set(customizedDialog);
        }
      },
      'show-modal-dialog': data => {
        if (data.dialog_type === "integration-dialog") {
          this.set(_.merge({title: "", options: {}}, data.dialog_data.integration));
        }
      },
      'hide-modal-dialog': () => {
        this.reset();
      },
      'updated:active_chat': (jid) => {
        if (!jid || (jid && jid === this.local.active_chat)) {
          return;
        }
        this.local.active_chat = jid;
        var current_dialog = ModalDialogStore.getCurrentModalDialog();
        if (current_dialog === "integration-dialog") {
          DialogActions.closeDialog();
        }
      }
    });

    AppDispatcher.register(integrations_event_names.ON_INTEGRATIONS_REMOVED, (data) => {
      let active_chat = IntegrationStore.get('active_chat');
      if (!active_chat || !_.find(data.rooms, {id: active_chat.id})) {
        return;
      }

      var addon_check = _.find(data.integrations, { 'addon_key': this.get('addon_key'), 'is_deleted': true });
      if(addon_check) {
        DialogActions.closeDialog();
      }
    });
  }

  isActiveDialogOwner(addonKey) {
    return (this.get('addon_key') === addonKey);
  }
}

export default new IntegrationDialogStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/integration_dialog_store.js
 **/