import Store from 'lib/core/store';
import AppDispatcher from 'dispatchers/app_dispatcher';
import AppConfig from 'config/app_config';

class ModalDialogStore extends Store {

  constructor() {
    super();

    // Allowance for animation
    this.delayDuration = AppConfig.modal_transition_allowance;
    this.delayTimeout = null;

    this.activationDelay = 100;

    this.local = {
      fileViewerOpened: false
    };
  }

  getDefaults() {
    return {
      activeDialog: false,
      dialogData: false,
      dialogVisible: false,
      btnLoading: false,
      bgDismiss: true,
      web_server: AppConfig.default_web_server,
      dialogs_queue: []
    };
  }

  registerListeners() {
    AppDispatcher.register({
      'show-modal-dialog': (data) => {
        let dialogData = {
          activeDialog: data.dialog_type,
          dialogVisible: false,
          dialogData: data.dialog_data,
          btnLoading: false
        };

        if (!this.isQueueableDialog(dialogData) && this.isDialogActive(dialogData)) {
          return;
        }

        // If I'm in the middle of the closing animation from one dialog, and I'm told to
        // show another, clear that animation timeout and wipe out the old dialog data
        if (this.deactivateTimeout) {
          clearTimeout(this.deactivateTimeout);
          this.deactivateTimeout = null;
          this.data.dialogData = null;
          this.data.activeDialog = null;
        }

        if (this.isQueueableDialog(dialogData) && this.shouldDialogQueue()) {
          this.data.dialogs_queue.push(dialogData);
        } else {
          this.showDialog(dialogData);
        }
      },
      'hide-modal-dialog': () => {
        // If I'm in the middle of the opening animation from one dialog, and I'm told
        // to close it, clear that animation timeout and shut it down
        if (this.activateTimeout) {
          clearTimeout(this.activateTimeout);
          this.activateTimeout = null;
        }

        // Set dialog invisible
        this.set({
          dialogVisible: false,
          btnLoading: false
        });

        // after animation timeout, wipe out dialog data
        this.deactivateDialog();

        if (this.data.dialogs_queue.length) {
          let nextDialog = this.data.dialogs_queue.shift();
          this.showDialog(nextDialog);
        }
      },
      'modal-dialog-btn-loading': (data) => {
        this.set('btnLoading', !!data.loading);
      },
      'updated:web_server': (web_server) => {
        this.set("web_server", web_server);
      },
      'open-in-file-viewer': () => {
        this.local.fileViewerOpened = true;
      },
      'file-viewer-closed': () => {
        this.local.fileViewerOpened = false;

        if (this.data.dialogs_queue.length) {
          let nextDialog = this.data.dialogs_queue.shift();
          this.showDialog(nextDialog);
        }
      }
    });
  }

  showDialog(data) {
    // Init dialog data
    this.set({
      activeDialog: data.activeDialog,
      dialogVisible: data.dialogVisible,
      dialogData: data.dialogData,
      btnLoading: data.btnLoading
    });

    // Set dialog visible after animation to trigger focus hooks
    this.activateDialog();
  }

  activateDialog() {
    let activate = () => {
      this.set('dialogVisible', true);
      this.activateTimeout = null;
    };

    if (this.activationDelay) {
      this.activateTimeout = setTimeout(activate, this.activationDelay);
    } else {
      activate();
    }

  }

  deactivateDialog() {
    let deactivate = () => {
      this.set({
        activeDialog: null,
        dialogData: false
      });
    };

    if (this.delayDuration){
      this.deactivateTimeout = setTimeout(()=>{
        if (!this.get('dialogVisible')){
          deactivate();
          this.delayTimeout = null;
        }
      }, this.delayDuration);
    } else {
      deactivate();
    }
  }

  getCurrentModalDialog() {
    return this.get("activeDialog");
  }

  isDialogActive(dialog) {
    return this.get('activeDialog') === dialog.activeDialog;
  }

  isQueueableDialog(dialog) {
    return !!_.get(dialog, 'dialogData.should_queue');
  }

  shouldDialogQueue() {
    return this.data.dialogVisible || this.local.fileViewerOpened;
  }

}

export default new ModalDialogStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/modal_dialog_store.js
 **/