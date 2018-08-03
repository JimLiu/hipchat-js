import QuickSwitcherActions from 'actions/quick_switcher_actions';
import KeyboardShortcutStrings from 'strings/keyboard_shortcut_strings';
import keyboardShortcuts from 'helpers/keyboard_shortcuts';
import strings from 'strings/quick_switcher_strings';
import utils from "helpers/utils";
import cx from 'classnames';

export default React.createClass({

  displayName: 'QuickSwitcherHint',

  componentWillMount() {
    let keyCommand = keyboardShortcuts.getCommandByTitle(KeyboardShortcutStrings.new_chat);
    if (keyCommand) {
      this._keyCommand = keyCommand.join('+').toUpperCase();
    }
  },

  getIcon() {
    let icon;

    if (utils.platform.isMac()) {
      icon = (
        <span className='hc-qs-hint-key mac-hint-key'>
          {KeyboardShortcutStrings.command}
        </span>
      );
    } else {
      icon = (
        <span className='hc-qs-hint-key'>
          <span className='aui-icon aui-icon-small aui-iconfont-info' />
        </span>
      );
    }
    return icon;
  },

  _onClick() {
    QuickSwitcherActions.hideHint();
  },

  render() {

    let classes = cx({
          'hc-qs-hint': true,
          'hidden': !this._keyCommand,
          'with-results': this.props.with_results
        }),
        hint_icon = this.getIcon();

    return (
      <div className={classes} ref='hint'>
        {hint_icon}
        <span className='hc-qs-hint-text'>
          {`${strings.hint_text} ${this._keyCommand}`}
        </span>
        <span
          onClick={this._onClick}
          ref='close_hint'
          className='aui-icon aui-icon-small aui-iconfont-remove-label hc-qs-hint-close'>
        </span>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/quick_switcher/quick_switcher_hint.js
 **/