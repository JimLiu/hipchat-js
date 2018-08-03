var ModalDialog = require("components/common/modal_dialog/modal_dialog");
var KeyboardShortcutStrings = require("strings/keyboard_shortcut_strings");

module.exports = React.createClass({

  displayName: "KeyboardShortcutsDialog",

  getDefaultProps: function() {
    return {
      shortcuts: {}
    };
  },

  _getKeyItem: function (command, index) {
    var keys = this._getKeyLayout(command.keys);
    return (
      <li className="hc-list-item" key={index}>
        <span className="hc-list-item-desc">{command.title}</span>
        {keys}
      </li>
    );
  },

  _getKeyLayout: function (keys) {
    return (
      <span className="hc-list-item-action">
        {
          _.map(keys, (item, index) => {
            return this._getKey(item, index);
          })
        }
      </span>
    );
  },

  _getKey: function (key, index) {
    var keyClass = "hc-key-" + key.type,
        name = key.name,
        keyLayout;
    if (index !== 0) {
      keyLayout = (
        <span key={index}>
          <span className="hc-key-separator">{KeyboardShortcutStrings.separator}</span>
          <kbd className={keyClass}>{name}</kbd>
        </span>
      );
    } else {
      keyLayout = (
        <kbd className={keyClass} key={index}>{name}</kbd>
      );
    }
    return keyLayout;
  },

  _dialogBody: function() {
    return (
      <ul className="hc-list">
        {
          _.map(this.props.shortcuts, (command, index) => {
            return this._getKeyItem(command, index);
          })
        }
      </ul>
    );
  },

  render: function() {
    var attrs = {
          'dialogId': 'keyboard-shortcuts-dialog',
          'title': 'Keyboard Shortcuts',
          'dialogBody': this._dialogBody,
          'size': 'medium'
        };

    return (
      <ModalDialog {...attrs} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/keyboard_shortcuts_dialog/keyboard_shortcuts_dialog.js
 **/