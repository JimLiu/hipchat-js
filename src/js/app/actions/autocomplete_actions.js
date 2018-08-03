/**
 * AutoCompleteActions
 */

var AppDispatcher = require('dispatchers/app_dispatcher');

var AutoCompleteActions = {

  processEmoticonText: function (data) {
    AppDispatcher.dispatch("process-emoticon-text", {
      text: data.text,
      caret_position: data.caret_position
    });
  },

  dismissEmoticonAutoComplete: function () {
    AppDispatcher.dispatch("dismiss-emoticon-autocomplete");
  },

  emoticonSelected: function () {
    AppDispatcher.dispatch("emoticon-selected");
  },

  processMentionText: function (data) {
    AppDispatcher.dispatch('process-mention-text', {
      text: data.text,
      caret_position: data.caret_position
    });
  },

  processSlashCommandText({ text, caret_position }){
    AppDispatcher.dispatch('process-slash-command-text', { text, caret_position });
  },

  dismissMentionAutoComplete: function () {
    AppDispatcher.dispatch("dismiss-mention-autocomplete");
  },

  navigateAutoComplete: function (data) {
    AppDispatcher.dispatch("navigate-autocomplete", {
      autocomplete: data.autocomplete,
      direction: data.direction
    });
  },

  mentionSelected: function () {
    AppDispatcher.dispatch("mention-selected");
  },

  menuItemHovered: function (data) {
    AppDispatcher.dispatch("menu-item-hovered", {
      type: data.type,
      index: data.index
    });
  },

  slashCommandSelected(){
    AppDispatcher.dispatch("slash-command-selected");
  }
};

module.exports = AutoCompleteActions;


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/autocomplete_actions.js
 **/