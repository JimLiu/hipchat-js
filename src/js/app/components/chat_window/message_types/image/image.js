import FileViewerActions from 'actions/file_viewer_actions';
import fileHelper from 'helpers/file_helper';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';
import ScrollingMediaObserver from 'components/mixins/scrolling_media_observer_mixin';

export default React.createClass({

  displayName: 'ImageComponentType',

  mixins: [DeepEqualRenderMixin, ScrollingMediaObserver],

  componentDidMount: function() {
    this._setImageSrc();

    if (this.props.msg.media_loaded){
        let img = ReactDOM.findDOMNode(this.refs.image);
        let size = _.get(this.props.msg, `media_sizes`, {})[this.props.msg.link_details.image];
        if (size && size.width && size.height){
          img.width = size.width;

          img.height = size.height;
        }
      }
  },

  componentDidUpdate(){
    if (!this.state.failed){
      this._setImageSrc();
    }
  },

  _setImageSrc(){
    let img = ReactDOM.findDOMNode(this.refs.image);
    let src = this.props.msg.link_details.image;

    if(img.src !== src) {
      img.src = this.props.msg.link_details.image;
    }
  },

  _onClick: function(evt) {
    if (fileHelper.shouldOpenFileViewer(evt)) {
      evt.preventDefault();
      FileViewerActions.openInFileViewer(this.props.msg.link_details);
    }
  },

  render: function() {
    return (
      <a href={this.props.msg.link_details.url}
         target="_blank"
         title={fileHelper.basename(this.props.msg.link_details.url)}
         onClick={this._onClick}>
         <img ref="image" src=""/>
      </a>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/image/image.js
 **/