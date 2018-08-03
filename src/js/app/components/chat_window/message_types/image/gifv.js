import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';
import ScrollingMediaObserver from 'components/mixins/scrolling_media_observer_mixin';
import Image from 'components/chat_window/message_types/image/image';

export default React.createClass({

  mixins: [DeepEqualRenderMixin, ScrollingMediaObserver],

  componentDidMount: function() {
    var video = ReactDOM.findDOMNode(this.refs.video),
        mp4 = ReactDOM.findDOMNode(this.refs.mp4),
        webm = ReactDOM.findDOMNode(this.refs.webm),
        mp4Url = this.props.msg.link_details.mp4,
        webmUrl = this._getWebM();

    if (video){
      if (!this._canPlayMp4()) {
        video.src = webmUrl;
      } else {
        video.src = mp4Url;
      }
      mp4.src = mp4Url;
      webm.src = webmUrl;

      if (this.props.msg.media_loaded){
        let src = this._canPlayMp4() ? mp4Url : webmUrl;
        let size = _.get(this.props.msg, `media_sizes`, {})[src];

        if (size && size.width && size.height){
          video.width = size.width;
          video.height = size.height;
        } else {
          this.setState({
            failed: true
          });
        }
      }
    }
  },

  getVideo(){
    return (
      <a href={this.props.msg.link_details.url}
         target="_blank"
         title={this.props.msg.link_details.name || this.props.msg.link_details.url}>
        <video ref="video"
               mute="true"
               loop="true"
               src=""
               autoPlay="true">
          <source ref="mp4" src=""/>
          <source ref="webm" src=""/>
        </video>
      </a>
    );
  },

  getFailedState(){
    return <Image {...this.props}/>;
  },

  render: function() {
    return (this.state.failed) ? this.getFailedState() : this.getVideo();
  },

  // (sadpanda).
  // The .mp4 version doesn't play in the Windows Chromium app. We can't just fall
  // back to the .gif version, because Imgur reserves the right to delete them if
  // they are over 20 Mb. Platform will be giving us the .webm info soon (see
  // https://jira.atlassian.com/browse/HC-23799). When that lands, remove this.
  _getWebM() {
    return this.props.msg.link_details.webm || this.props.msg.link_details.mp4.replace(/\.mp4/, '.webm');
  },

  _canPlayMp4() {
    var video = ReactDOM.findDOMNode(this.refs.video);
    return video.canPlayType && video.canPlayType('video/mp4');
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/image/gifv.js
 **/