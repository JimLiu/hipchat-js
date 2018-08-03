import AuiTextAreaFieldGroup from "components/common/aui/form/aui_textarea_fieldgroup";
import DialogActions from "actions/dialog_actions";
import FormActions from "actions/form_actions";
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';
import AppConfig from 'config/app_config';
import utils from 'helpers/utils';

export default React.createClass({

  displayName: "EditMessageForm",

  mixins: [DeepEqualRenderMixin],

  componentDidMount() {
    this._focusInput();
    this.shouldAutoFocus = true;
  },

  componentDidUpdate() {
    if (this.props.dialogVisible && this.shouldAutoFocus) {
      this._focusInput();
      this.shouldAutoFocus = false;
    }
  },

  componentWillUpdate(nextProps, nextState) {
    if (nextState.body !== this.props.message.body) {
      this.props.activateDialogButton();
    } else {
      this.props.deactivateDialogButton();
    }
  },

  componentWillUnmount() {
    if(this.delayedFocus) {
      clearTimeout(this.delayedFocus);
    }
  },

  getInitialState() {
    let msg = this.props.message;
    if (this.props.message.message_type === 'file' &&
        this.props.message.body.indexOf('File uploaded') === 0 &&
        this.props.message.rendered_body === '') {
       msg = _.assign({}, this.props.message, { body: '' });
    }
    return msg;
  },

  _handleKeyDown(evt) {
    if(evt.keyCode === utils.keyCode.Enter && !utils.keyCode.isModified(evt)) {
      this._onSubmit(evt);
    }
  },

  _onChange(evt) {
    this.setState({
      body: evt.target.value
    });
  },

  _onSubmit: function (e) {
    e.preventDefault();
    FormActions.editMessage({
      jid: this.state.from,
      message: this.state.body,
      original_mid: this.state.mid,
      ts: this.state.ts
    });
    this._closeDialog();
  },

  _closeDialog() {
    DialogActions.closeDialog();
  },

  _focusInput() {
    this.delayedFocus = _.delay(()=>{
      let textArea = ReactDOM.findDOMNode(this).querySelector('#message-to-edit');
      textArea.focus();
      textArea.setSelectionRange(this.state.body.length,this.state.body.length);
    }, AppConfig.modal_transition_allowance);
  },

  render() {
    return (
      <form id="edit-message-form" ref="form" className="aui" onSubmit={this._onSubmit}>
        <AuiTextAreaFieldGroup
          id="message-to-edit"
          label={this.state.sender}
          rows="5"
          cols="400"
          maxLength={AppConfig.max_message_text_length}
          value={this.state.body}
          onKeyDown={this._handleKeyDown}
          onChange={this._onChange}>
        </AuiTextAreaFieldGroup>
        <span className="edit-display-time">{this.state.display_time}</span>
      </form>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/edit_message_form.js
 **/