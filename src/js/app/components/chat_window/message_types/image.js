import utils from "helpers/utils";
import strings from 'strings/chat_panel_strings';
import Image from './image/image';
import GifV from './image/gifv';
import cx from 'classnames';
import fileHelper from 'helpers/file_helper';
import FileViewerActions from 'actions/file_viewer_actions';
import ChatWindowActions from 'actions/chat_window_actions';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';

export default React.createClass({

  displayName: "ImageMessageType",

  mixins: [DeepEqualRenderMixin],

  getInitialState: function () {
    return {
      userExpanded: null,
      timeout: false
    };
  },

  _isGifV: function() {
    return this.props.msg.type === 'image' && !!_.get(this.props.msg, 'link_details.mp4');
  },

  _isUserExpanded: function() {
    return !this.props.msg.is_collapsed;
  },

  _shouldBeExpanded: function() {
    var extension = utils.file.get_extension(this.props.msg.link_details.image);
    if (this.props.shouldHideAttachedCards) {
      return false;
    }
    if (this.props.shouldHideGifs) {
      return !/^gif/.test(extension);
    }
    return true;
  },

  _isExpanded: function() {
    if (this.state.userExpanded === null) {
      return (this._shouldBeExpanded() ? this._isUserExpanded() : false);
    }
    return this.state.userExpanded;
  },

  _getCollapsedImage: function() {
    return (
      <div className="info">
        <i>{strings.image_hidden}</i>
      </div>
    );
  },

  _getExpandedImage: function() {
    var props = {
        ref: "image",
        msg: this.props.msg
      },
      content;

    if (this._isGifV()) {
      content = (
        <GifV {...props}/>
      );
    } else {
      content = (
        <Image {...props}/>
      );
    }

    return (
      <div className="image-preview-wrapper">
        {content}
      </div>
    );
  },

  _onClick: function(evt) {
    if (fileHelper.shouldOpenFileViewer(evt)) {
      evt.preventDefault();
      FileViewerActions.openInFileViewer(this.props.msg.link_details);
    }
  },

  _toggleImage: function () {
    var isExpanded = this._isExpanded();
    this.setState({
      userExpanded: !isExpanded
    });
    ChatWindowActions.toggleImage({
      jid: this.props.msg.room,
      mid: this.props.msg.mid
    });
  },

  render: function () {
    var isExpanded = this._isExpanded(),
      toggleClasses = cx({
        'toggle-image': true,
        'collapse': isExpanded,
        'expand': !isExpanded
      }),
      content;

    if (isExpanded) {
      content = this._getExpandedImage();
    } else {
      content = this._getCollapsedImage();
    }

    return (
      <div className="msg-line" data-mid={this.props.msg.mid}>
        <div className="toggle-wrap" onClick={this._toggleImage}>
          <span className={toggleClasses}></span>
        </div>
        {content}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/image.js
 **/