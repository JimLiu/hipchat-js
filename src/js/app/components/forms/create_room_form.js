import AuiInputFieldGroup from "components/common/aui/form/aui_input_fieldgroup";
import RoomPrivacyRadios from "components/forms/room_privacy_radios";
import FlagActions from "actions/flag_actions";
import DialogActions from "actions/dialog_actions";
import FormActions from "actions/form_actions";
import RoomNavActions from "actions/room_nav_actions";
import FormsStore from "stores/forms_store";
import strings from 'strings/forms_strings';
import FormErrors from "strings/form_error_strings";
import ChatHeaderStrings from 'strings/chat_header_strings';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';
import AppConfig from 'config/app_config';

export default React.createClass({

  displayName: "CreateRoomForm",

  mixins: [DeepEqualRenderMixin],

  componentDidMount: function() {
    FormsStore.on('change:roomNames', this._onChange);
    this.shouldAutoFocus = true;
  },

  componentWillUnmount: function() {
    FormsStore.off('change:roomNames', this._onChange);
  },

  componentDidUpdate: function() {
    if (this.state.errors.name || (this.props.dialogVisible && this.shouldAutoFocus)) {
      this._focusInput();
      this.shouldAutoFocus = false;
    }
  },

  getInitialState: function () {
    var initialState = _.extend({
      room_name: this.props.room_name || null,
      room_topic: this.props.room_topic || null,
      privacy: this.props.privacy || "public"
    }, this._getState());
    return initialState;
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
    var form_inputs = $(this.refs.form).serializeArray(),
        privacy = (form_inputs[2]) ? form_inputs[2].value : "public",
        submit_data = {
          name: form_inputs[0].value.trim(),
          topic: (form_inputs[1]) ? form_inputs[1].value.trim() : "",
          privacy
        };

    let errors = this._validateFormData(submit_data);
    if (errors) {
      this.setState({ errors, privacy });
    } else {
      this.setState({ errors: {}, privacy });
      DialogActions.startBtnLoading();
      FormActions.createRoom(submit_data, this._handleResponse);
    }
  },

  _validateFormData: function (formData) {
    let errors = {};

    // validate room name
    if (!formData.name) {
      errors.name = FormErrors.create_room_form.no_room_name;
    } else if (formData.name.length > 50) {
      errors.name = FormErrors.create_room_form.name_too_long;
    } else if (_.find(this.state.roomNames, function (roomName) { return _.isString(roomName) && (roomName.toLowerCase() === formData.name.toLowerCase()); })) {
      errors.name = FormErrors.create_room_form.room_already_exists;
    }

    // validate room topic
    if (formData.topic.length > AppConfig.max_topic_text_length) {
      errors.topic = ChatHeaderStrings.topic_length_error(AppConfig.max_topic_text_length);
    }

    return !_.isEmpty(errors) ? errors : null;
  },

  _handleResponse: function (error, room) {
    if (error) {
      this.setState({
        errors: {
          name: error.status === 403 ? FormErrors.create_room_form.no_permisions : (error.message || strings.fail.create_room)
        }
      });
      DialogActions.stopBtnLoading();
    } else {
      var name = room.name || "Room",
          success_msg = strings.success.room_created(name);
      this._throwFlagSuccess(success_msg);
      RoomNavActions.select(room.jid, 'groupchat');
    }
  },

  _throwFlagSuccess: function (msg) {
    FlagActions.showFlag({
      type: "success",
      body: msg,
      close: "auto"
    });
  },

  _showDialog: function () {
    DialogActions.showCreateRoomDialog();
  },

  _focusInput: function () {
    document.getElementById('create-room-name').focus();
  },

  render: function () {
    var errors = this.state.errors;
    let room_name = this.state.room_name;
    let room_topic = this.state.room_topic;
    let privacy = this.state.privacy;
    return (
      <form id="create-room-form" ref="form" className="aui" onSubmit={this._onSubmit}>
        <AuiInputFieldGroup value={room_name}
                            disabled={this.props.loading}
                            ref="nameField"
                            id="create-room-name"
                            label={strings.label.room_name}
                            maxLength="50"
                            description={strings.description.create_room_description}
                            error={errors.name} />
        <AuiInputFieldGroup value={room_topic}
                            disabled={this.props.loading}
                            ref="topicField"
                            id="create-room-topic"
                            label={strings.label.room_topic}
                            maxLength={AppConfig.max_topic_text_length}
                            description={strings.description.create_room_topic}
                            error={errors.topic} />
        <RoomPrivacyRadios disabled={this.props.loading}
                           defaultChecked={privacy}/>
      </form>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/create_room_form.js
 **/