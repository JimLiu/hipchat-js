var ModalDialog = require("components/common/modal_dialog/modal_dialog"),
    strings = require('strings/dialog_strings'),
    CreateRoomForm = require("components/forms/create_room_form"),
    ieSubmitMixin = require('components/mixins/ie_submit_mixin'),
    DialogVisibilityMixin = require('components/mixins/modal_dialog_visibility_mixin'),
    cx = require('classnames');

module.exports = React.createClass({

  displayName: "CreateRoomDialog",

  mixins: [ieSubmitMixin, DialogVisibilityMixin],

  _dialogBody: function () {
    return (
      <CreateRoomForm dialogVisible={this.state.dialogVisible}
                      loading={this.props.btnLoading}
                      room_name={this.props.room_name}
                      room_topic={this.props.room_topic}
                      privacy={this.props.privacy} />
    );
  },

  _dialogFooterButton: function () {
    var btnClasses = cx({
          'aui-button': true,
          'aui-button-primary': true
        });

    return (
      <button form="create-room-form" className={btnClasses} aria-disabled={this.props.btnLoading} disabled={this.props.btnLoading} type="submit" onClick={this.ieSubmit}>{strings.create_room}</button>
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="create-room-dialog"
        title={strings.create_a_new_room}
        dialogBody={this._dialogBody}
        dialogFooterButton={this._dialogFooterButton}
        btnLoading={this.props.btnLoading}
        closeLinkText="Cancel" />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/create_room_dialog/create_room_dialog.js
 **/