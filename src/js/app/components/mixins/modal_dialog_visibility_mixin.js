import ModalDialogStore from 'stores/modal_dialog_store';

export default {

  getInitialState: function() {
    return ModalDialogStore.getAll();
  },

  _onChange: function() {
    if (this.isMounted()) {
      this.setState(ModalDialogStore.getAll());
    }
  },

  componentWillMount: function() {
    ModalDialogStore.on('change', this._onChange);
  },

  componentWillUnmount: function() {
    ModalDialogStore.off('change', this._onChange);
  }

};


/** WEBPACK FOOTER **
 ** ./src/js/app/components/mixins/modal_dialog_visibility_mixin.js
 **/