import ChatInputStore from 'stores/chat_input_store';
import FlagActions from 'actions/flag_actions';
import ChatInputActions from 'actions/chat_input_actions';
import FileUploaderActions from 'actions/file_uploader_actions';
import AutoCompleteActions from 'actions/autocomplete_actions';
import MessageActions from 'actions/message_actions';
import MentionAutoComplete from './mention_autocomplete';
import EmoticonAutoComplete from './emoticon_auto_complete';
import SlashCommandAutoComplete from './slash_command_auto_complete';
import Tooltip from 'components/tooltip/tooltip';
import AppDispatcher from 'dispatchers/app_dispatcher';
import utils from 'helpers/utils';
import FormsStrings from 'strings/forms_strings';
import VideoServiceKeys from 'keys/video_service_keys';
import CurrentUserActions from 'actions/current_user_actions';
import AppConfig from 'config/app_config';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import AnalyticsActions from 'actions/analytics_actions';
import ChatActionsButton from './actions/chat_action_button';
import Presence from 'lib/enum/presence';
import cx from 'classnames';
import { uiAvailablePromise } from 'helpers/analytics';
import * as slashCommandHelper from 'helpers/slash_command_helper';
import mousePosition from 'helpers/mouse_position';

var getInputState = function () {
  return ChatInputStore.getAll();
};

let lastPosn = 0;

let sentActiveMessageDelay = AppConfig.sent_active_message_delay;
let sentComposingMessageTimeout;

let composingIntervalTimer = AppConfig.sent_composing_message_interval;
let sentComposingMessageInterval;

function getSelection() {
  var hasText = false;
  if (typeof window.getSelection !== "undefined") {
    hasText = window.getSelection().toString();
  } else if (typeof document.selection !== "undefined" && document.selection.type === "Text") {
    hasText = document.selection.createRange().text;
  }

  return hasText;
}

function onDocClick(evt){
  let correspondingUseElement = evt.target.correspondingUseElement || evt.target;

  if (evt.target !== document && !$(correspondingUseElement).is('.hc-ac-name, #hc-message-input')) {
    AutoCompleteActions.dismissMentionAutoComplete();
    AutoCompleteActions.dismissEmoticonAutoComplete();
  }
}

const ProgressBarSelector = '#upload-progress-bar';

export default React.createClass({

  displayName: "ChatInput",

  getInitialState: function () {
    return getInputState();
  },

  componentDidMount: function () {
    var textArea = ReactDOM.findDOMNode(this.refs.message);
    this._setTextAreaLayout(textArea);
    document.addEventListener('click', this._focusIfAllowed);
    ChatInputStore.on('change', this._onChange);
    this._debouncedOnCaretUpdate = _.debounce(this._onCaretUpdate, 20, {leading: true, trailing: true});
    this._debouncedWindowResize = _.debounce(() => $(window).trigger('resize'), 100, { leading: true, trailing: false});
    this._debouncedShouldSendChatStateMessage = _.debounce(this._shouldSendChatStateMessage,
      200,
      {leading: true, trailing: false}
    );
    AppDispatcher.register("application-focused", this._focusIfAllowed);
    AppDispatcher.register("new-active-chat", this._focusIfAllowed);
    AppDispatcher.register("hide-modal-dialog", this._focusIfAllowed);
    AppDispatcher.register("hide-inline-dialog", this._focusIfAllowed);
    this._focus();
    this._moveCaretToEnd();
    $(document).on('click', onDocClick);
    AJS.$(document).on('aui-dropdown2-show', this._blur);
    AJS.$(document).on('aui-dropdown2-hide', this._focusIfAllowed);
    uiAvailablePromise.then(this._sendLaunchToChat);
    if (this.state.text) {
      this._autoSize();
    }
    this._setUploadProgress(this.state.upload_progress, null);
    if (this.state.file
      && this.state.attachment_expanded
      && this.state.file.file_obj
      && !this.state.file_error
      && !this.state.uploading) {
      ChatInputActions.openTooltip({
        type: 'upload_preview',
        data: {
          file: this.state.file.file_obj
        }
      });
    }
  },

  componentWillUnmount: function () {
    this._debouncedOnCaretUpdate.cancel();
    this._debouncedWindowResize.cancel();
    this._debouncedShouldSendChatStateMessage.cancel();
    document.removeEventListener('click', this._focusIfAllowed);
    ChatInputStore.off('change', this._onChange);
    AppDispatcher.unregister("application-focused", this._focusIfAllowed);
    AppDispatcher.unregister("new-active-chat", this._focusIfAllowed);
    AppDispatcher.unregister("hide-modal-dialog", this._focusIfAllowed);
    AppDispatcher.unregister("hide-inline-dialog", this._focusIfAllowed);
    $(document).off('click', onDocClick);
    AJS.$(document).off('aui-dropdown2-show', this._blur);
    AJS.$(document).off('aui-dropdown2-hide', this._focusIfAllowed);
    AutoCompleteActions.dismissMentionAutoComplete();
    AutoCompleteActions.dismissEmoticonAutoComplete();
    ChatInputActions.closeTooltip({type: 'upload_preview'});
  },

  componentWillUpdate: function(nextProps, nextState){
    if (this.state.active_chat !== nextState.active_chat) {
      if (!nextState.attachment_expanded || !nextState.file.file_obj) {
        ChatInputActions.closeTooltip({type: 'upload_preview'});
      }
      AnalyticsDispatcher.dispatch('analytics-active-chat-changed', {jid: nextState.active_chat});
    } else if (!this.state.text && nextState.text) {
      AnalyticsDispatcher.dispatch('analytics-set-message-value', nextState.text);
    }
  },

  componentDidUpdate: function(prevProps, prevState){
    this._autoSize();
    if (this.state.active_chat_id !== prevState.active_chat_id) {
      this._moveCaretToEnd();
    } else if (this.state.new_forced_caret_position) {
      utils.setCaretPosition(ReactDOM.findDOMNode(this.refs.message), this.state.new_forced_caret_position);
      ChatInputActions.resetNewForcedCaretPosition();
    }
    if (prevState.file && this.state.file && prevState.file.file_obj && !this.state.file.file_obj) {
      ChatInputActions.closeTooltip({type: 'upload_preview'});
    }
    this._setUploadProgress(this.state.upload_progress, prevState.upload_progress);
  },

  _setUploadProgress(current, prev){
    if (document.querySelector(ProgressBarSelector)) {
      if (current !== null){
        AJS.progressBars.update(ProgressBarSelector, current);
      } else if (current === null && prev !== null) {
        AJS.progressBars.setIndeterminate(ProgressBarSelector);
      }
    }
  },

  _setTextAreaLayout: function(textArea) {
    let computedStyle = window.getComputedStyle(textArea, null);

    this._textAreaLayout['maxHeight'] = parseInt(computedStyle.maxHeight, 10) || 210;
    this._textAreaLayout['scrollHeight'] = textArea.clientHeight;
  },

  _textAreaLayout: {
    maxHeight: 0,
    scrollHeight: 0
  },

  _sendLaunchToChat: function() {
    let activeChat = ChatInputStore.get('active_chat'),
        isRoom = utils.jid.is_room(activeChat),
        // 0 if room, 1 if OTO. We can assume we're not in the lobby or search
        // because we don't render the chat input there
        size = isRoom ? 0 : 1;

    AnalyticsActions.handleLaunchToChat({ size });
  },

  _autoSize: function () {
    var textArea = ReactDOM.findDOMNode(this.refs.message);

    if (this._textAreaLayout['scrollHeight'] !== textArea.scrollHeight) {
      var chatInput = ReactDOM.findDOMNode(this);

      // Changes of textArea height also affect message list height (and it's scroll position).
      // So to avoid redundant scroll jumps we should preserve height of the chatInput during textArea height changes.
      chatInput.style.height = chatInput.clientHeight + 'px';

      textArea.style.height = 0;
      textArea.style.height = textArea.scrollHeight + 'px';

      chatInput.style.height = '';

      if (textArea.scrollHeight >= this._textAreaLayout['maxHeight']) {
        if (textArea.style.overflowY !== 'visible') {
          textArea.style.overflowY = "visible";
          $(ReactDOM.findDOMNode(this)).find(".hc-text-input").addClass('hc-textarea-has-scroll');
        }
      } else {
        if (textArea.style.overflowY !== 'hidden') {
          textArea.style.overflowY = "hidden";
          $(ReactDOM.findDOMNode(this)).find(".hc-text-input").removeClass('hc-textarea-has-scroll');
        }
      }
      this._textAreaLayout['scrollHeight'] = textArea.scrollHeight;
      this._debouncedWindowResize();
    }
  },

  _getAutoComplete: function () {
    var autoComplete;

    if (this.state.active_autocomplete === "mention" && this.state.mention_list.length) {
      autoComplete = (
        <MentionAutoComplete
          ref="mentionAC"
          mention_text={this.state.mention_text}
          mention_list={this.state.mention_list}
          mention_results_count={this.state.mention_results_count}
          mention_selected_item={this.state.mention_selected_item}
          should_animate_avatar={this.state.should_animate_avatar}
          textarea_ref={this.refs.message} />
      );
    } else if (this.state.active_autocomplete === "emoticon" && this.state.emoticon_list.length) {
      autoComplete = (
        <EmoticonAutoComplete
          ref="emoticonAC"
          emoticon_text={this.state.emoticon_text}
          emoticon_list={this.state.emoticon_list}
          emoticon_results_count={this.state.emoticon_results_count}
          emoticon_selected_item={this.state.emoticon_selected_item}
          path_prefix={this.state.path_prefix}
          textarea_ref={this.refs.message} />
      );
    } else if (this.state.active_autocomplete === "slash_command" && this.state.slash_command_list.length) {
      autoComplete = (
          <SlashCommandAutoComplete
              ref="slash_commandAC"
              slash_command_results_count={this.state.slash_command_results_count}
              slash_command_selected_item={this.state.slash_command_selected_item}
              slash_commands_list={this.state.slash_command_list}
              textarea_ref={this.refs.message}
          />
      );
    }
    return autoComplete;
  },

  render: function () {
    let textInputClasses = cx({
      "hc-textwrapper": true,
      "hc-text-input": true,
      "hc-file-sharing-disabled": !this.state.can_share_files
    });
    let textareaClasses = cx({
      'mousetrap': true,
      'textarea': true,
      'hc-textarea': true
    });
    let autoComplete = this._getAutoComplete();

    return (
      <form className="aui">
        <table width="100%" height="100%" cellSpacing="0">
          <tbody>
            <tr>
              <ChatActionsButton
                ref="file_btn"
                active_chat={this.state.active_chat}
                on_keydown={this._onKeydown}
                file_name={this.state.file_name}
                attachment_expanded={this.state.attachment_expanded}
                uploading={this.state.uploading}
                file_error={this.state.file_error}
                file_error_message={this.state.file_error_message}
                file_extension={this.state.file_extension}
                can_share_files={this.state.can_share_files}
                chat_type={this.props.chat_type} />
              <td height="100%">
                <div className="hc-text-input-autocomplete-container">
                   {autoComplete}
                </div>
                <div className={textInputClasses}>
                  <textarea
                    id={AppConfig.chat_input_id}
                    className={textareaClasses}
                    rows="1"
                    onChange={this._onValueChange}
                    onKeyDown={this._onKeydown}
                    onKeyUp={this._debouncedOnCaretUpdate}
                    onClick={this._debouncedOnCaretUpdate}
                    onPaste={this._onPaste}
                    value={this.state.text}
                    ref="message" />
                  <div className="smiley-icon" onClick={this._onSmileyClick}>
                    <span className="aui-icon hipchat-icon-small icon-emoticon">Emoticons</span>
                    <Tooltip type="smiley_selector"/>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    );
  },

  _onChange: function (evt) {
    this._debouncedOnCaretUpdate(evt);
    this.setState(getInputState());
  },

  _onCaretUpdate: function(evt){
    if (this.state.chat_type === 'chat' && evt.keyCode) {
      this._debouncedShouldSendChatStateMessage(evt);
    }
    var node = ReactDOM.findDOMNode(this.refs.message),
        caretPosn = utils.getCaretPosition(node),
        msgText = node.value,
        msgMention = msgText,
        endSelectedPosition = utils.getEndSelection(node);
    if (endSelectedPosition !== caretPosn) {
      msgMention = msgText.slice(0, caretPosn) + msgText.slice(endSelectedPosition);
    }
    if (caretPosn !== lastPosn || (caretPosn === lastPosn && utils.keyCode.isSelected(evt))) {
      lastPosn = caretPosn;
      this._processEmoticonText(msgText, caretPosn);
      var activeChat = this.state.active_chat;
      if (!utils.jid.is_private_chat(activeChat)) {
        this._processMentionText(msgMention, caretPosn);
      }
      this._processSlashCommandText(msgText, caretPosn);
      ChatInputActions.setCaretPosition(caretPosn);
    }
  },

  _processMentionText: function (msgText, caretPosn) {
    if (this.state.active_autocomplete !== 'mention' && this.state.active_autocomplete) {
      return;
    }
    AutoCompleteActions.processMentionText({
      text: msgText,
      caret_position: caretPosn
    });
  },

  _processEmoticonText: function (msgText, caretPosn) {
    if (this.state.active_autocomplete !== 'emoticon' && this.state.active_autocomplete) {
      return;
    }
    AutoCompleteActions.processEmoticonText({
      text: msgText,
      caret_position: caretPosn
    });
  },

  _processSlashCommandText(msgText, caretPosn){
    if (this.state.active_autocomplete !== 'slash_command' && this.state.active_autocomplete) {
      return;
    }
    AutoCompleteActions.processSlashCommandText({
      text: msgText,
      caret_position: caretPosn
    });
  },

  _processPresence: function(text){
    var index = text.indexOf(' '),
      show_type = text,
      payload = {
        type: 'showAndStatus'
      },
      status;

    if (_.includes(text, ' ')){
      status = text.substr(index).trim();
      if (status) {
        payload.status = status;
      }
      show_type = show_type.substr(0, index);
    }

    switch (show_type.substr(1)){
      case 'available':
      case 'here':
      case 'back':
        payload.show = Presence.AVAILABLE;
        break;

      case 'away':
        payload.show = Presence.AWAY;
        break;

      case 'dnd':
        payload.show = Presence.DND;
        break;
    }

    CurrentUserActions.changeStatus(payload);
  },

  _clearFileInput: function () {
    var node = document.getElementById('fileInput');
    if (node) {
      node.value = null;
    }
  },

  _onKeydown: function (evt) {
    if (!this.state.initialized){
      return;
    }

    this.state.text = utils.strings.stripHiddenCharacters(this.state.text);

    if (this.state.active_autocomplete) {
      mousePosition.useLatest();
      var $node = $(ReactDOM.findDOMNode(this.refs[this.state.active_autocomplete + 'AC']));
      if ($node.find('.aui-inline-dialog.show').length) {
        // up
        if (evt.keyCode === utils.keyCode.UpArrow) {
          AutoCompleteActions.navigateAutoComplete({
            autocomplete: this.state.active_autocomplete,
            direction: "up"
          });
          evt.preventDefault();
        }

        // down
        if (evt.keyCode === utils.keyCode.DownArrow) {
          AutoCompleteActions.navigateAutoComplete({
            autocomplete: this.state.active_autocomplete,
            direction: "down"
          });
          evt.preventDefault();
        }

        // tab or enter
        if (evt.keyCode === utils.keyCode.Tab || evt.keyCode === utils.keyCode.Enter) {
          if (this.state.active_autocomplete === "mention") {
            AutoCompleteActions.mentionSelected();
          } else if (this.state.active_autocomplete === "emoticon") {
            AutoCompleteActions.emoticonSelected();
          } else if (this.state.active_autocomplete === "slash_command") {
            AutoCompleteActions.slashCommandSelected();
          }
          evt.preventDefault();
          return;
        }
      }
    } else if (evt.keyCode === utils.keyCode.Tab) {
      if (this.state.attachment_expanded && evt.shiftKey) {
        // Only allow tab-backward if we're uploading
      } else {
        // Don't allow tab-forward (or any tab if we're not uploading)
        evt.preventDefault();
      }
      return;
    } else if (evt.keyCode === utils.keyCode.Enter && (evt.ctrlKey || evt.altKey)) {
      // let the default shift+enter behavior bubble up, since modifying the text by adding a '\n' results in weird behavior
      evt.shiftKey = true;
      return;
    }
    // escape
    if (evt.keyCode === utils.keyCode.Esc) {
      if (!this.state.active_autocomplete) {
        // Always make sure we focus the message input
        ReactDOM.findDOMNode(this.refs.message).focus();
        ChatInputActions.closeTooltip({type: 'upload_preview'});
        ChatInputActions.closeAttachment({jid: this.state.active_chat});
      }
      AutoCompleteActions.dismissMentionAutoComplete();
      AutoCompleteActions.dismissEmoticonAutoComplete();
      evt.preventDefault();
    }

    if (this.state.message_editing_enabled && this.state.text === '' &&
        evt.keyCode === utils.keyCode.UpArrow && !utils.keyCode.isModified(evt)) {
        evt.preventDefault();
        ChatInputActions.getLastMessageSentByCurrentUser(this.state.active_chat, MessageActions.initiateMessageEdit);
    }

    if (evt.keyCode === utils.keyCode.Enter && !evt.shiftKey) {
      evt.preventDefault();
      if (this.state.text && this._invalidMessageLength(this.state.text)) {
        // Message is too long
        ChatInputActions.showMessageLengthError();
      } else if (!this.state.uploading && this.state.attachment_expanded && !this.state.file_error) {
        if (this.state.text && this._invalidFileDescriptionLength(this.state.text)) {
          // File description is too long
          ChatInputActions.showFileDescriptionLengthError();
        } else {
          FileUploaderActions.uploadFile({
            file: this.state.file,
            fileName: this.state.file_name,
            jid: this.state.active_chat,
            room_id: this.state.active_chat_id,
            message: this.state.text
          });
          this._sendUploadAnalyticsEvent();
          ChatInputActions.closeTooltip({type: 'upload_preview'});
          ReactDOM.findDOMNode(this.refs.message).focus();
          this._clearFileInput();
        }
      } else if (this.state.text.trim().length) {
        let command = slashCommandHelper.matchCommand({
          text: this.state.text,
          jid: this.state.active_chat,
          is_guest: this.props.is_guest,
          video_enabled: this.state.video_enabled,
          room_video_enabled: this.state.video_enabled && this.state.web_client_enso_video_enabled && this.state.web_client_enso_room_video_enabled
        });

        slashCommandHelper.executeCommand(command, {
          jid: this.state.active_chat,
          text: this.state.text,
          videoService: this.state.web_client_enso_video_enabled ? VideoServiceKeys.ENSO : VideoServiceKeys.ADDLIVE,
          room_id: this.state.active_chat_id,
          room_is_archived: this.state.room_is_archived
        });

        if (command){
          AnalyticsActions.slashCommandUsed({
            room: utils.jid.is_room(this.state.active_chat) ? this.state.active_chat_id : null,
            slashUsed: command.name
          });
        }

        if (command && command.should_send_message || !command){

          if (utils.jid.is_private_chat(this.state.active_chat) && !this.state.can_use_oto_chats) {

            FlagActions.showFlag({
              type: 'warning',
              close: 'auto',
              body: FormsStrings.fail.oto_chats_disabled
            });

            return;
          }

          if (this.state.room_is_archived) {

            FlagActions.showFlag({
              type: 'warning',
              close: 'auto',
              body: FormsStrings.fail.sent_message_in_archived_room
            });

            return;
          }

          ChatInputActions.sendMessage({
            text: this.state.text,
            jid: this.state.active_chat,
            id: this.state.message_id,
            active_chat_id: this.state.active_chat_id,
            chat_type: this.state.chat_type
          });
        }
      }
    }
  },

  _shouldSendChatStateMessage: function (evt) {
    if (evt.keyCode === utils.keyCode.Delete ||
      evt.keyCode === utils.keyCode.Backspace) {
      return false;
    }

    this._updateDelay();
    if (this.state.text.trim().length
      && !sentComposingMessageInterval
      && this.state.user_state === 'active') {
      this._sendComposingStateMessage();
    } else if (this.state.user_state === 'composing') {
      if (!this.state.text.trim().length ||
        !sentComposingMessageTimeout) {
        this._sendActiveStateMessage();
      }
    }
  },

  _updateDelay: function() {
    clearTimeout(sentComposingMessageTimeout);
    sentComposingMessageTimeout = setTimeout(() => {
      this._sendActiveStateMessage();
      clearTimeout(sentComposingMessageTimeout);
      sentComposingMessageTimeout = null;
    }, sentActiveMessageDelay);
  },

  _sendComposingStateMessage: function() {
    this._sentState('composing');
    sentComposingMessageInterval = setInterval(() => {
      this._sentState('composing');
    }, composingIntervalTimer);
  },

  _sendActiveStateMessage: function() {
    clearInterval(sentComposingMessageInterval);
    sentComposingMessageInterval = null;
    this._sentState('active');
  },

  _sentState: function(state) {
    ChatInputActions.setUserState({
      jid: this.state.active_chat,
      type: 'chat',
      state
    });
  },

  _onValueChange: function (evt) {

    if (!this.state.initialized){
      return;
    }

    ChatInputActions.setMsgValue({
      text: evt.target.value
    });
  },

  _invalidMessageLength: function (text) {
    return (text.length >= AppConfig.max_message_text_length);
  },

  _invalidFileDescriptionLength: function (text) {
    return (text.length > AppConfig.max_file_description_length);
  },

  _focusingDisabled: function() {
    var disabled = false;
    if (window.HC && window.HC.Config && window.HC.Config.composeMessageDisabled) {
      disabled = window.HC.Config.composeMessageDisabled;
    }

    return disabled;
  },

  _focusIfAllowed: function (e) {
    if (!e || !$(e.target).closest('[data-no-focus]').length) {
      _.delay(() => {
        let activeEl = _.get(document.activeElement, 'tagName');
        if (this.isMounted() && !this._focusingDisabled() && !_.includes(["INPUT", "TEXTAREA"], activeEl)
          && document.querySelectorAll(".aui-blanket").length === 0
          && $(".aui-dropdown2[aria-hidden='false']").length === 0) {
          this._focus();
        }
      }, AppConfig.modal_transition_allowance);
    }
  },

  _focus: function () {
    var selection = getSelection();
    if (!this._isFocused() && !selection) {
      ReactDOM.findDOMNode(this.refs.message).focus();
    }
  },

  _blur: function() {
    ReactDOM.findDOMNode(this.refs.message).blur();
  },

  _moveCaretToEnd: function () {
    if (this.state.text) {
      utils.setCaretPosition(ReactDOM.findDOMNode(this.refs.message), this.state.text.length);
      ChatInputActions.setCaretPosition(this.state.text.length);
    }
  },

  _isFocused: function() {
    return ReactDOM.findDOMNode(this.refs.message) === document.activeElement;
  },

  _onSmileyClick: function (evt) {
    var className = evt.currentTarget.className;
    if (!~className.indexOf(' selected')) {
      evt.currentTarget.className += ' selected';

      AnalyticsDispatcher.dispatch("analytics-event", {
        name: "hipchat.client.emoticon.dialog.launched"
      });
    } else {
      evt.currentTarget.className = className.replace(' selected', '');
    }
    ChatInputActions.toggleTooltip({
      type: 'smiley_selector',
      data: {
        smileys: this.state.smileys,
        user_is_admin: this.state.user_is_admin,
        web_server: this.state.web_server
      }
    });
  },

  _sendUploadAnalyticsEvent() {
    var fileType = utils.file.get_selected_file_type(this.state.file);
    var roomType = (utils.room.detect_chat_type(this.state.active_chat) === "groupchat") ? "room" : "oto";
    AnalyticsActions.fileUploadRequested(fileType.minor, roomType, this.state.file_selection_source);
  },

  _onPaste: function(evt) {
    if (!this.state.uploading) {
      FileUploaderActions.filePasted(evt);
    }
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/chat_input.js
 **/