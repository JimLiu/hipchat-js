import utils from "helpers/utils";
import FileViewerActions from 'actions/file_viewer_actions';
import AppActions from 'actions/app_actions';
import fileHelper from 'helpers/file_helper';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: "RightSideBarFile",

  propTypes: {
    file: React.PropTypes.object.isRequired,
    use_24hr_time: React.PropTypes.bool.isRequired
  },

  mixins: [PureRenderMixin],

  render: function () {

    var time = utils.format_time(this.props.file.date, this.props.use_24hr_time);
    return (
      <li className="hc-roster-item">
        <div className="aui-nav-item" title={this.props.file.file_name}>
          <a className="hc-file-link" target="_blank" rel="noreferrer"
              href={this.props.file.url}
              onClick={this._onClick} >
            <span className={"hc-file-icon " + this.props.file.icon_class}></span>
            <span className="hc-file-name">{this.props.file.file_name}</span>
          </a>
          <span className="hc-roster-user-name">{this.props.file.user_name}</span>
          <span className="hc-roster-date">{time}</span>
        </div>
      </li>
    );
  },

  _onClick: function (evt) {
    if (fileHelper.shouldOpenFileViewer(evt)) {
      evt.preventDefault();
      if (evt.metaKey) {
        AppActions.openExternalWindow(this.props.file.url, '_blank');
      } else {
        FileViewerActions.openInFileViewer(this.props.file);
      }
    }
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/file.js
 **/