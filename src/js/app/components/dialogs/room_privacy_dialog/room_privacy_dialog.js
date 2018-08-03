var ModalDialog = require("components/common/modal_dialog/modal_dialog"),
    strings = require('strings/dialog_strings'),
    RoomPrivacyForm = require("components/forms/room_privacy_form"),
    ieSubmitMixin = require('components/mixins/ie_submit_mixin'),
    cx = require('classnames');

module.exports = React.createClass({

  displayName: "RoomPrivacyDialog",

  mixins: [ieSubmitMixin],

  _dialogBody: function () {
    return (
      <RoomPrivacyForm jid={this.props.jid} name={this.props.name} privacy={this.props.privacy} loading={this.props.btnLoading} />
    );
  },

  _dialogFooterButton: function () {
    var btnClasses = cx({
          'aui-button': true,
          'aui-button-primary': true
        });

    return (
      <button form="room-privacy-form" className={btnClasses} aria-disabled={this.props.btnLoading} disabled={this.props.btnLoading} type="submit" onClick={this.ieSubmit}>{strings.set_privacy}</button>
    );
  },

  render: function () {
    return (
      <ModalDialog dialogId="room-privacy-dialog"
        title={strings.change_privacy}
        dialogBody={this._dialogBody}
        dialogFooterButton={this._dialogFooterButton}
        btnLoading={this.props.btnLoading}
        closeLinkText={strings.cancel} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/room_privacy_dialog/room_privacy_dialog.js
 **/