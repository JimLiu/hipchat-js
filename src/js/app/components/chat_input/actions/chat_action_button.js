import IntegrationDropDownAction from 'components/common/actions_dropdown/integration_dropdown_action.js';
import DropDownAction from 'components/common/actions_dropdown/dropdown_action.js';
import DropDown from 'components/common/actions_dropdown/actions_dropdown';
import FileUploader from './file_uploader';
import FileErrorTooltip from './file_error_tooltip';
import Tooltip from 'components/tooltip/tooltip';
import FileUploaderActions from 'actions/file_uploader_actions';
import ChatInputActions from 'actions/chat_input_actions';
import IntegrationsStore from 'stores/integrations_store';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import IntegrationsHelper from 'helpers/integration_helper';
import strings from 'strings/chat_input_strings';
import cx from 'classnames';
import utils from 'helpers/utils';

function getState() {
  return {
    integrations: IntegrationsStore.getExtensionsByLocation("hipchat.input.action"),
    integrations_enabled: IntegrationsStore.get('enabled')
  };
}

module.exports = React.createClass({

  displayName: "ChatActionsButton",

  getInitialState() {
    return getState();
  },

  componentDidMount() {
    IntegrationsStore.on(["change:integrations", "change:integrations_enabled", "change:active_chat"], this._updateState);
  },

  componentWillUpdate(nextProps) {
    if (nextProps.attachment_expanded && !this.props.attachment_expanded) {
      ChatInputActions.dismissActionsDropDown();
    }
    if (nextProps.active_chat !== this.props.active_chat) {
      this._clearFileInputValue();
    }
  },

  componentWillUnmount() {
    IntegrationsStore.off(["change:integrations", "change:integrations_enabled", "change:active_chat"], this._updateState);
  },

  _updateState() {
    return this.setState(getState());
  },

  _onFileChosen(evt) {
    FileUploaderActions.fileChosen(evt, "browse");
  },

  _openFilePicker(evt) {
    evt.preventDefault();
    if (!this.props.attachment_expanded) {
      FileUploaderActions.openFilePicker();
    }
  },

  _clearFileInputValue() {
    var node = ReactDOM.findDOMNode(this.refs.fileInput);
    if (node) {
      node.value = null;
    }
  },

  _getContentsState() {
    var val = "upload";
    if (this.props.attachment_expanded) {
      val = "uploading";
    } else if (this.state.integrations_enabled
      && this.state.integrations.length > 0
      && this.props.chat_type === "groupchat") {
      val = "integrations";
    } else {
      val = "upload";
    }
    return val;
  },

  _getFileIcon() {
    return this._getContentsState() === "uploading" ?
      utils.file.get_icon_class(this.props.file_name) :
      "icon-attachment";
  },

  _getAttachButton() {
    var fileIcon = this._getFileIcon();
    var linkClasses = cx("aui-icon", "hipchat-icon-small", "hc-file-icon", fileIcon);

    return (
      <a className="hc-attach" onClick={this._openFilePicker}>
        <span className={linkClasses} title={strings.attachment}></span>
      </a>
    );
  },

  _getIntegrationsDropDown() {
    return <DropDown dropdown_id="input_actions_dropdown"
                      icon="aui-iconfont-add"
                      lazy_options={this._renderOptions}
                      onShow={this._onShow}
                      location="above"
                      default_option="last"/>;
  },

  _getFileButtonContents(contentsState) {
    var action;

    switch (contentsState) {
      case "uploading":
      case "upload":
        action = this._getAttachButton();
        break;

      case "integrations":
        action = this._getIntegrationsDropDown();
        break;
    }
    return action;
  },

  render() {
    var contentsState = this._getContentsState();
    var action = this._getFileButtonContents(contentsState);
    let showFileError = this.props.file_error && this.props.attachment_expanded;
    var fileError = (showFileError) ? this._getFileError() : null;
    var fileBtnClasses = cx({
      "hc-file-btn": contentsState === "uploading" || contentsState === "upload",
      "has-file": contentsState === "uploading",
      "input_actions_trigger": contentsState === "integrations",
      "hidden": !this.props.can_share_files
    });

    return (
      <td id="hc-chat-actions" ref="fileBtn" className={fileBtnClasses}>
        <input className="hidden" ref="fileInput" type="file" id="fileInput" onChange={this._onFileChosen} multiple="false"/>
        <Tooltip type="upload_preview"/>
        {fileError}
        {action}
        <FileUploader
          on_keydown={this.props.on_keydown}
          file_name={this.props.file_name}
          file_error={this.props.file_error}
          file_extension={this.props.file_extension}
          attachment_expanded={this.props.attachment_expanded}
          uploading={this.props.uploading}
          active_chat={this.props.active_chat} />
      </td>
    );
  },

  _renderOptions() {
    var options = _.map(this.state.integrations, action =>
      <IntegrationDropDownAction key={IntegrationsHelper.to_full_key(action.addon_key, action.key)}
                                 action={action}
                                 msg={this.props.msg}/>);



    return [
      <ul key="items" className="aui-list-truncate">
        {options}
        <DropDownAction onClick={this._openFilePicker}
                        key="upload-file"
                        item_id="hc-chat-actions-upload-file"
                        title={strings.upload_file}/>
      </ul>,
      <div key="arrow" id="hc-chat-actions-arrow"></div>
    ];
  },

  _onShow: function () {
    AnalyticsDispatcher.dispatch('analytics-event', {
      name: 'hipchat.client.integrations.input.action.open'
    });
  },

  _getFileError: function () {
    return (
      <FileErrorTooltip anchor={ReactDOM.findDOMNode(this.refs.fileBtn)} error={this.props.file_error_message}/>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/actions/chat_action_button.js
 **/