import ModalDialogAlt from "components/common/modal_dialog/modal_dialog_alternate";
import appConfig from "config/app_config";
import ReleaseNotesStrings from "strings/release_notes_strings";
import DialogActions from "actions/dialog_actions";
import AppStore from "stores/application_store";

function matchEndpoint(type, subtype) {
  switch (type) {
    case 'qt':
      return matchEndpoint(subtype);

    case 'windows':
      return 'qtwindows';

    case 'linux':
      return 'qtlinux';

    default:
      return type;
  }
}

export default React.createClass({

  displayName: "ReleaseNotesDialog",

  getInitialState: function () {
    return {
      asset_base_uri: AppStore.get('asset_base_uri'),
      client_version_id: AppStore.get('client_version_id'),
      endpoint: matchEndpoint(AppStore.get('client_type'), AppStore.get('client_subtype'))
    };
  },

  _onClick: function() {
    DialogActions.closeDialog();
  },

  _dialogBody: function() {
    return (
      <div className="release-notes">
        <img src={this.state.asset_base_uri + appConfig.new_hotness_image_asset} />
        <h2 className="release-notes-header">{ReleaseNotesStrings.header}</h2>
        <div className="inner-content">
          <iframe ref='iframe' src={`https://www.hipchat.com/release_notes/client_embed/${this.state.endpoint}?version_str=${this.state.client_version_id}`} />
        </div>
        <button className="aui-button aui-button-primary" onClick={this._onClick} >{ReleaseNotesStrings.close}</button>
      </div>
    );
  },

  render: function() {
    return (
      <ModalDialogAlt dialogId="release-notes-dialog"
                      dialogBody={this._dialogBody}
                      size="small"/>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/release_notes_dialog/release_notes_dialog.js
 **/