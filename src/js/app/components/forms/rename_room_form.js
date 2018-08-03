import AuiInputFieldGroup from "components/common/aui/form/aui_input_fieldgroup";
import FlagActions from "actions/flag_actions";
import DialogActions from "actions/dialog_actions";
import FormActions from "actions/form_actions";
import FormErrors from "strings/form_error_strings";
import FormsStore from "stores/forms_store";
import strings from "strings/forms_strings";

module.exports = React.createClass({

  displayName: "RenameRoomForm",

  componentDidMount: function() {
    FormsStore.on('change:roomNames', this._onChange);
  },

  componentWillUnmount: function() {
    FormsStore.off('change:roomNames', this._onChange);
  },

  componentDidUpdate: function() {
    if (this.state.errors.name || this.props.dialogVisible) {
        this._focusInput();
    }
  },

  getInitialState: function () {
    return this._getState();
  },

  _onChange: function(){
    this.setState(this._getState());
  },

  _getState: function(){
    return {
      roomNames: FormsStore.get("roomNames"),
      errors: {}
    };
  },

  _onSubmit: function (e) {
    e.preventDefault();
    var form_inputs = $(ReactDOM.findDOMNode(this.refs.form)).serializeArray(),
        name = form_inputs[0].value.trim();

    var errors = this._validate(name);
    if (errors) {
      this.setState({
        errors: errors
      });
    } else {
      this._clearErrors();
      DialogActions.startBtnLoading();
      FormActions.changeRoomName({
        jid: this.props.jid,
        name: name
      }, this._handleResponse);
    }
  },

  _validate: function (name) {
    if (!name) {
      return {
        name: FormErrors.rename_room_form.no_room_name
      };
    } else if (name.length > 50) {
      return {
        name: FormErrors.rename_room_form.name_too_long
      };
    } else if (name === this.props.name) {
      return {
        name: FormErrors.rename_room_form.same_name
      };
    } else if (_.find(this.state.roomNames, function (roomName) { return _.isString(roomName) && (roomName.toLowerCase() === name.toLowerCase()); })) {
      return {
        name: FormErrors.rename_room_form.room_already_exists
      };
    }
  },

  _clearErrors: function () {
    this.setState({
      errors: {}
    });
  },

  _handleResponse: function (error) {
    if (error) {
      this.setState({
        errors: {
          name: (error.message || strings.fail.rename_flag)
        }
      });
      DialogActions.stopBtnLoading();
    } else {
      this._throwFlagSuccess(strings.success.rename_flag);
      this._closeDialog();
    }
  },

  _throwFlagSuccess: function (msg) {
    FlagActions.showFlag({
      type: "success",
      body: msg,
      close: "auto"
    });
  },

  _flagActionClick: function (e) {
    e.preventDefault();
    var flag_index = $(e.target).closest(".hc-flag").data('flag-index');
    FlagActions.removeFlag(flag_index);
    this._showDialog();
  },

  _flagBody: function () {
    return () => (
        <div>
          <ul className="aui-nav-actions-list">
            <li><a onClick={this._flagActionClick} href="#">{strings.button.try_again}</a></li>
          </ul>
        </div>
      );
  },

  _showDialog: function () {
    DialogActions.showRenameRoomDialog({
      jid: this.props.jid,
      name: this.props.name
    });
  },

  _closeDialog: function () {
    DialogActions.closeDialog();
  },

  _focusInput: function () {
    document.getElementById('room-name').focus();
  },

  render: function () {
    var errors = this.state.errors;

    return (
      <form id="rename-room-form" ref="form" className="aui" onSubmit={this._onSubmit}>
        <AuiInputFieldGroup id="room-name" ref="nameField" disabled={this.props.loading} maxLength="50" label={strings.label.new_room_name} error={errors.name}/>
      </form>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/rename_room_form.js
 **/