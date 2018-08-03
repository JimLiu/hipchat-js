import FileUploaderActions from 'actions/file_uploader_actions';
import ChatInputActions from 'actions/chat_input_actions';
import strings from 'strings/chat_input_strings';
import cx from 'classnames';
import utils from 'helpers/utils';

module.exports = React.createClass({

  displayName: "ChatInputFileUploader",

  componentWillUpdate(nextProps) {
    if (nextProps.attachment_expanded && !this.props.attachment_expanded) {
      _.defer(this._checkShouldFocus);
    }
  },

  _checkShouldFocus: function () {
    var re = new RegExp(`^${strings.upload_default_name}\\.`);
    if (re.test(this.props.file_name)) {
      this._focusAndSelect();
    }
  },

  _focusAndSelect: function () {
    var input = ReactDOM.findDOMNode(this.refs.name_input);
    if (input !== document.activeElement) {
      input.focus();
    }
  },

  _onFileNameClick: function (e) {
    this._onFocus(e);
  },

  _onFileNameChange: function (e) {
    FileUploaderActions.changeFileName({file_name: e.target.value});
  },

  _onFocus: function (e) {
    var input = e.target;
    // Perform the selection after a timeout since the default behavior will be to "select everything"
    _.defer(function() {
      var dotIndex = input.value.lastIndexOf('.');
      if (dotIndex !== -1) {
        input.setSelectionRange(0, dotIndex);
      }
    });
  },

  _onBlur: function (e) {
    var input = e.target;
    if (!input.value) {
      input.value = `${strings.upload_default_name}.${this.props.file_extension}`;
    } else if (!!this.props.file_extension && !/\.\S+$/.test(input.value)) {
      // Ensure the filename ends with an extension
      if (input.value.indexOf('.') === -1) {
        input.value += `.${this.props.file_extension}`;
      } else {
        input.value += this.props.file_extension;
      }
    }
    this._onFileNameChange(e);
  },

  _onKeyDown: function (e) {
    if (e.keyCode === utils.keyCode.Tab) {
      // Don't allow shift-tab (only tab forward into message input)
      if (e.shiftKey) {
        e.preventDefault();
      }
    } else {
      this.props.on_keydown(e);
    }
  },

  _closeAttachmentInput: function (e) {
    e.stopPropagation();
    var fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.value = null;
    }
    ChatInputActions.closeTooltip({type: 'upload_preview'});
    ChatInputActions.closeAttachment({jid: this.props.active_chat});
  },

  render() {
    var uploadClassNames = cx({hidden: !this.props.attachment_expanded, "upload-input": true}),
        linkClassNames = cx({hidden: this.props.uploading, "close-upload": true}),
        progressBarClasses = cx({hidden: !this.props.uploading, "aui-progress-indicator": true}),
        textInputClasses = cx({hidden: this.props.uploading, error: this.props.file_error});

    return (
      <div ref="file_uploader" className={uploadClassNames}>
        <input ref="name_input" id="upload-name-input" type="text" value={this.props.file_name}
               onClick={this._onFileNameClick}
               onChange={this._onFileNameChange}
               onFocus={this._onFocus}
               onBlur={this._onBlur}
               className={textInputClasses}
               onKeyDown={this._onKeyDown}/>
        <a ref="file_link" className={linkClassNames} onClick={this._closeAttachmentInput}>
          <span className="aui-icon hipchat-icon-small hc-close-icon icon-close"/>
        </a>
        <div ref="upload_progress" id="upload-progress-bar" className={progressBarClasses}>
          <span className="aui-progress-indicator-value"></span>
        </div>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/actions/file_uploader.js
 **/