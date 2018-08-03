import AppDispatcher from 'dispatchers/app_dispatcher';

export default {

  setInputText(data) {
    AppDispatcher.dispatch('qs-input-value', data);
  },

  selectPrev() {
    AppDispatcher.dispatch('qs-select-prev');
  },

  selectNext() {
    AppDispatcher.dispatch('qs-select-next');
  },

  selectItem() {
    AppDispatcher.dispatch('qs-select-item');
  },

  itemHovered(data) {
    AppDispatcher.dispatch('qs-item-hover', {
      index: data.index
    });
  },

  reset() {
    AppDispatcher.dispatch('qs-reset');
  },

  filter() {
    AppDispatcher.dispatch('qs-filter');
  },

  hideHint() {
    AppDispatcher.dispatch('qs-hide-hint');
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/quick_switcher_actions.js
 **/