var ModalDialog = require("components/common/modal_dialog/modal_dialog"),
    RenameRoomForm = require("components/forms/rename_room_form"),
    strings = require('strings/dialog_strings'),
    ieSubmitMixin = require('components/mixins/ie_submit_mixin'),
    DialogVisibilityMixin = require('components/mixins/modal_dialog_visibility_mixin'),
    cx = require('classnames');

module.exports = React.createClass({

  displayName: "RenameRoomDialog",

  mixins: [ieSubmitMixin, DialogVisibilityMixin],

  _dialogBody: function () {
    return (
      <RenameRoomForm dialogVisible={this.state.dialogVisible}
                      jid={this.props.jid}
                      name={this.props.name}
                      loading={this.props.btnLoading}/>
    );
  },

  _dialogFooterButton: function () {
    var btnClasses = cx({
          'aui-button': true,
          'aui-button-primary': true
        });

    return (
      <button form="rename-room-form" className={btnClasses} aria-disabled={this.props.btnLoading} disabled={this.props.btnLoading} type="submit" onClick={this.ieSubmit}>{strings.rename}</button>
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="rename-room-dialog"
        title={strings.rename_room(this.props.name)}
        dialogBody={this._dialogBody}
        dialogFooterButton={this._dialogFooterButton}
        btnLoading={this.props.btnLoading}
        closeLinkText={strings.cancel} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/rename_room_dialog/rename_room_dialog.js
 **/