import utils from 'helpers/utils';
import FileViewerActions from 'actions/file_viewer_actions';
import fileHelper from 'helpers/file_helper';
import Card from './card';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';

export default React.createClass({

  displayName: "VideoMessageType",

  mixins: [DeepEqualRenderMixin],

  render: function () {
    return (<Card id={this.props.msg.mid} url={this.props.msg.link_details.url}
                  style='link' thumbnail={ {url: this.props.msg.link_details.thumb}}
                  icon='/wc/assets/img/youtube-favicon-32.png'
                  title={this.props.msg.link_details.title}
                  description=''
                  fallback={this.getFallbackMessage()} mid={this.props.msg.mid}/>);
  },

  /**
   * This message is going to be deprecated when cards are fully functional
   * @returns {XML}
   * @deprecated
   */
  getFallbackMessage: function () {
    return (
      <div className="msg-line" data-mid={this.props.msg.mid}>
        <div data-mid={this.props.msg.mid} className="video-wrap">
          <a href={this.props.msg.link_details.url} className="file-video-default-poster" onClick={this._onClick}>
            <img src={this.props.msg.link_details.thumb}/>
          </a>
          <p className="linkTitle">
            <a href={this.props.msg.link_details.url} target="_blank">
              {this.props.msg.link_details.title}
            </a>
          </p>
          <p className="linkDesc">{utils.formatNumber(this.props.msg.link_details.views)} views
            <br />
            {this.props.msg.link_details.author}
          </p>
        </div>
      </div>
    );
  },

  _onClick: function(evt){
    if (fileHelper.shouldOpenFileViewer(evt)) {
      evt.preventDefault();
      FileViewerActions.openInFileViewer(this.props.msg.link_details);
    }
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/video.js
 **/