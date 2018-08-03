import HeaderStrings from "strings/app_header_strings";
import AppHeaderActions from "actions/app_header_actions";
import KeyboardShortcuts from "helpers/keyboard_shortcuts";
import DialogActions from "actions/dialog_actions";
import ConfigStore from 'stores/configuration_store';
import AppConfig from 'config/app_config.js';
import utils from 'helpers/utils';

export default React.createClass({

  displayName: "HelpMenuContent",

  getInitialState () {
    return this._getState();
  },

  componentDidMount () {
    ConfigStore.on(["change:web_server", "change:feature_flags"], this._onChange);
  },

  componentWillUnmount () {
    ConfigStore.off(["change:web_server", "change:feature_flags"], this._onChange);
  },

  _onChange () {
    this.setState(this._getState());
  },

  _getState () {
    let client_subtype = ConfigStore.get("client_subtype");
    return {
      web_server: ConfigStore.get("web_server"),
      isWindows: utils.clientSubType.isWindows(client_subtype),
      isMac: utils.clientSubType.isMac(client_subtype),
      isNative: utils.clientSubType.isNative(client_subtype),
      isBTF: _.get(ConfigStore.get('feature_flags'), 'btf', false)
    };
  },

  _onKeyboardShortcutsClick () {
    var commands = KeyboardShortcuts.getKeyCommands();
    DialogActions.showKeyboardShortcutsDialog(commands);
  },

  _onWhatsNewClick () {
    AppHeaderActions.requestReleaseNotesDialog();
  },

  _getOnlineHelp () {
    return (
      <li>
        <a className="hc-online-help" href={AppConfig.help_link_url} target="_blank">{HeaderStrings.help}</a>
      </li>
    );
  },

  _getGetStartedLink () {
    return (
      <li>
        <a className="hc-get-started" href={AppConfig.get_started_url} target="_blank">{HeaderStrings.get_started}</a>
      </li>
    );
  },

  _getKeyboardShortcutsLink () {
    return (
      <li>
        <a className="hc-keyboard-shortcuts" onClick={this._onKeyboardShortcutsClick}>{HeaderStrings.keyboard_shortcuts}</a>
      </li>
    );
  },

  _getEmoticonListLink () {
    var link = `https://${this.state.web_server}/emoticons`;
    return (
      <li>
        <a className="hc-emoticon-list-link" href={link} target="_blank">{HeaderStrings.emoticon_list}</a>
      </li>
    );
  },

  _getWhatsNewLink () {
    if (this.state.isNative || this.state.isBTF) {
      return null;
    }
    return (
      <li>
        <a id="whats-new" onClick={this._onWhatsNewClick}>{HeaderStrings.whats_new}</a>
      </li>
    );
  },

  _getStatusLink () {
    return (
      <li>
        <a className="hc-status-page-link" href={AppConfig.status_page_url} target="_blank">{HeaderStrings.status}</a>
      </li>
    );
  },

  _getFeedbackLink () {
    return (
      <li>
        <a id="give-feedback" href={AppConfig.feedback_issue_url} target="_blank">{HeaderStrings.provide_feedback}</a>
      </li>
    );
  },

  render () {
    var onlineHelpLink = this._getOnlineHelp(),
        getStartedLink = this.props.read_only_mode ? false : this._getGetStartedLink(),
        keyboardShortcutsLink = this._getKeyboardShortcutsLink(),
        statusLink = (this.state.isBTF) ? false : this._getStatusLink(),
        emoticonLink = this.props.read_only_mode ? false : this._getEmoticonListLink(),
        showWhatsNewLink = (!this.state.isBTF && !this.state.isNative && !this.props.read_only_mode),
        whatsNewLink = showWhatsNewLink ? this._getWhatsNewLink() : false,
        feedbackLink = this.props.read_only_mode ? false : this._getFeedbackLink();

    return (
      <div className="aui-dropdown2-section">
        <ul>
          {onlineHelpLink}
          {getStartedLink}
          {keyboardShortcutsLink}
          {emoticonLink}
          {whatsNewLink}
          {statusLink}
          {feedbackLink}
        </ul>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/help_menu_content.js
 **/