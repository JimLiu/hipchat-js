import strings from 'strings/empty_state_strings';
import FileUploaderActions from 'actions/file_uploader_actions';

module.exports = React.createClass({

  displayName: "RightSideBarEmptyFileState",

  _openFilePicker: function(evt) {
    evt.preventDefault();
    FileUploaderActions.openFilePicker();
  },

  _getShareFileLink(){
    let link;
    if (this.props.can_share_files){
      link = <a href="#" onClick={this._openFilePicker}>{strings.share_a_file}</a>;
    }
    return link;
  },

  render: function(){
    return (
      <div className="hc-tab-es">
        <div className="hc-tab-es-img files"></div>
        <div className="hc-tab-es-title">{strings.no_files}</div>
        <div className="hc-tab-es-msg">
          {this._getShareFileLink()}
        </div>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/files_empty_state.js
 **/