import utils from "helpers/utils";
import FileViewerActions from 'actions/file_viewer_actions';
import fileHelper from 'helpers/file_helper';
import strings from 'strings/chat_panel_strings';
import cx from 'classnames';
import ChatWindowActions from 'actions/chat_window_actions';
import AppActions from 'actions/app_actions';
import MentionEmoticonTooltipMixin from 'components/mixins/mention_emoticon_tooltip_mixin';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';
import ScrollingMediaObserver from 'components/mixins/scrolling_media_observer_mixin';
import FileThumbnail from 'components/common/file_viewer/file_thumbnail';

export default React.createClass({

  displayName: "FileMessageType",

  mixins: [DeepEqualRenderMixin, MentionEmoticonTooltipMixin, ScrollingMediaObserver],

  getInitialState() {
    return {
      userExpanded: null
    };
  },

  componentWillMount() {
    let msg = this.props.msg;

    this._initRenderStrategies();

    if (this._renderStrategies[msg.file_data.file_type]) {
      this.renderStrategy = this._renderStrategies[msg.file_data.file_type];
    } else {
      this.renderStrategy = this._renderStrategies.file;
    }
  },

  _isUserExpanded() {
    return !this.props.msg.is_collapsed;
  },

  _shouldBeExpanded() {
    if (this.props.shouldHideAttachedCards) {
      return false;
    }
    if (this.props.shouldHideGifs) {
      return this.props.msg.file_data.file_ext !== 'gif';
    }
    return true;
  },

  _isExpanded() {
    if (this.state.userExpanded === null) {
      return (this._shouldBeExpanded() ? this._isUserExpanded() : false);
    }
    return this.state.userExpanded;
  },

  _getDescription() {
    if (this.props.msg.rendered_body) {
      return (<span className="description" dangerouslySetInnerHTML={{ __html: this.props.msg.rendered_body }}></span>);
    }
    return '';
  },

  render() {
    return this.renderStrategy();
  },

  _initRenderStrategies() {
    this._renderStrategies = {
      img: this._renderImgMessage,
      video: this._renderVideoMessage,
      file: this._renderFileMessage
    };
  },

  _renderImgMessage() {
    let msg = this.props.msg;
    let fileName = msg.file_data.file_name;

    let isExpanded = this._isExpanded(),
      toggleClasses = cx({
        'toggle-image': true,
        'collapse': isExpanded,
        'expand': !isExpanded
      }),
      fileMetaClasses = cx({
        'file-meta': true,
        'with-preview': true,
        'compact': !isExpanded
      });
    return (
      <div data-mid={msg.mid}
           className="msg-line"
           data-copyable={`{"format": "file", "mid": "${msg.mid}"}`}>
        <div className="toggle-wrap" onClick={this._toggleImage}>
          <span className={toggleClasses}></span>
        </div>
        { this._renderThumbnail() }
        <div className={fileMetaClasses}>
          <a href={msg.file_data.url} onClick={this._onClick}>{fileName}</a>
          <span className="file-size">{msg.file_data.file_size}</span>
        </div>
        { this._getDescription() }
      </div>
    );
  },

  _renderThumbnail() {
    if (this._isExpanded()) {
      return (
        <FileThumbnail
          file={this.props.msg.file_data}
          onClick={this._onClick}/>
      );
    }

    return (
      <div className="file-preview-wrapper info">
        <i>{strings.image_hidden}</i>
      </div>
    );
  },

  _renderVideoMessage() {
    let msg = this.props.msg;
    let fileName = msg.file_data.file_name;

    return (
      <div data-mid={msg.mid}
           className="msg-line"
           data-copyable={`{"format": "file", "mid": "${msg.mid}"}`}>
        <div className="file-preview-wrapper video-wrap">
          <span className="file-video-default-poster" onClick={this._onClick}></span>
        </div>
        <div className="file-meta with-preview">
          <a href={msg.file_data.url} onClick={this._onClick}>{fileName}</a>
          <span className="file-size">{msg.file_data.file_size}</span>
        </div>
        {this._getDescription()}
      </div>
    );
  },

  _renderFileMessage() {
    let msg = this.props.msg;
    let fileName = msg.file_data.file_name;
    let fileIcons = cx({
        'aui-icon': true,
        'hipchat-icon-small': true,
        'hc-file-icon': true
    });
    fileIcons = fileIcons + " " + utils.file.get_icon_class(fileName);

    return (
      <div data-mid={msg.mid}
           className="msg-line"
           data-copyable={`{"format": "file", "mid": "${msg.mid}"}`}>
        <div className="file-meta">
          <span className={fileIcons}></span>
          <a href={msg.file_data.url} onClick={this._onClick}>{fileName}</a>
          <span className="file-size">{msg.file_data.file_size}</span>
        </div>
        {this._getDescription()}
      </div>
    );
  },

  _toggleImage() {
    var isExpanded = this._isExpanded();
    this.setState({
      userExpanded: !isExpanded
    });
    ChatWindowActions.toggleImage({
      jid: this.props.msg.room,
      mid: this.props.msg.mid
    });
  },

  _videoTypeSupported(ext) {
    var video = document.createElement( "video" );
    if (video.canPlayType) {
      return {
        mp4: (video.canPlayType('video/mp4; codecs="mp4v.20.8"') || video.canPlayType('video/mp4; codecs="avc1.42E01E"') || video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')),
        m4v: (video.canPlayType('video/mp4; codecs="mp4v.20.8"') || video.canPlayType('video/mp4; codecs="avc1.42E01E"') || video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')),
        ogv: video.canPlayType('video/ogg; codecs="theora"'),
        webm: video.canPlayType('video/webm; codecs="vp8, vorbis"')
      }[ext];
    }
    return false;
  },

  _onClick(evt) {
    if (fileHelper.shouldOpenFileViewer(evt)) {
      evt.preventDefault();
      if (evt.metaKey) {
        let url = this.props.msg.file_data.url;
        AppActions.openExternalWindow(url, '_blank');
      } else {
        FileViewerActions.openInFileViewer(this.props.msg.file_data);
      }
    }
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/file.js
 **/