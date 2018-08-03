import AppConfig from 'config/app_config';
import ChatWindowActions from 'actions/chat_window_actions';

export default {

  getInitialState(){
    return {
      failed: false
    };
  },

  componentDidMount: function () {
    ChatWindowActions.preserveScrollValue({animation: true});
    this._observeMediaTags();
  },

  componentDidUpdate: function () {
    ChatWindowActions.preserveScrollValue({animation: false});
  },

  componentWillUnmount: function () {
    this._cleanupMediaTagObservers();
  },

  _getIdForMediaTag(mediaTag){
    let id = mediaTag.getAttribute('data-reactid') || mediaTag.getAttribute('id');
    if (!id){
      let fakeId = `hc-fake-react-id-${_.uniqueId()}`;
      mediaTag.id = fakeId;
      id = fakeId;
    }
    return id;
  },

  _observeMediaTag: function (mediaTag) {
    var id = this._getIdForMediaTag(mediaTag);
    var readyEvent = this._getReadyEvent(mediaTag);
    if (!this.props.msg.media_loaded){
      mediaTag.style.display = 'none';
      this._media_timeouts[id] = setTimeout(() => {
        this._onMediaTagFailed({target: mediaTag});
      }, AppConfig.message_image_loading_timeout);
      if (this._isImageTag(mediaTag)){
        this._media_size_intervals[id] = setInterval(() => {
          if (mediaTag.naturalHeight && mediaTag.naturalWidth){
            clearInterval(this._media_size_intervals[id]);
            delete this._media_size_intervals[id];
            this._onMediaSizeKnown(mediaTag);
          }
        }, AppConfig.message_image_size_check_interval);
      }
      mediaTag.addEventListener(readyEvent, this._onMediaTagReady);
      mediaTag.addEventListener('error', this._onMediaTagFailed);
    } else {
      mediaTag.addEventListener(readyEvent, this._onMediaTagReady);
    }
  },

  _onMediaSizeKnown(mediaTag){

    let $mediaTag = $(mediaTag),
      $chatRow = $mediaTag.parents('.hc-chat-row'),
      chatRowHeight = $chatRow.outerHeight();

    mediaTag.style.display = '';

    ChatWindowActions.updateScrollPosition({
      heightDiff: $chatRow.outerHeight() - chatRowHeight,
      offsetTop: $chatRow[0] && $chatRow[0].offsetTop
    });

    ChatWindowActions.messageMediaSizeFound({
      jid: this.props.msg.room,
      mid: this.props.msg.mid,
      src: mediaTag.src,
      size: {
        width: $mediaTag.width(),
        height: $mediaTag.height()
      }
    });
  },

  _getMedia(){
    var node = ReactDOM.findDOMNode(this);
    var imgs = _.toArray(node.querySelectorAll('img'));
    imgs = imgs.filter(function (img) {
      // if no height or width attr and unknown actual height, then it may
      // affect layout when loaded and needs to be observed
      return (!img.height && img.naturalHeight === 0) ||
        (!img.width && img.naturalWidth === 0);
    });
    var videos = _.toArray(node.querySelectorAll('video'));
    return imgs.concat(videos);
  },

  _observeMediaTags: function () {
    this._media = this._getMedia();
    this._media_timeouts = {};
    this._media_size_intervals = {};
    this._media_count = this._media.length;
    this._media.forEach(this._observeMediaTag);
  },

  _cleanupMediaTagObserver: function (mediaTag) {
    if (mediaTag) {
      var id = this._getIdForMediaTag(mediaTag);
      var readyEvent = this._getReadyEvent(mediaTag);
      mediaTag.removeEventListener(readyEvent, this._onMediaTagReady);
      mediaTag.removeEventListener('error', this._onMediaTagFailed);
      if (this._media_timeouts[id]) {
        clearTimeout(this._media_timeouts[id]);
        delete this._media_timeouts[id];
      }
      if (this._media_size_intervals[id]) {
        clearInterval(this._media_size_intervals[id]);
        delete this._media_size_intervals[id];
      }
      this._media = _.without(this._media, mediaTag);
    }
  },

  _getReadyEvent: function (mediaTag) {
    return this._isImageTag(mediaTag) ? 'load' : 'loadedmetadata';
  },

  _isImageTag(mediaTag){
    return mediaTag.tagName.toLowerCase() !== 'video';
  },

  _cleanupMediaTagObservers: function () {
    if (this._media) {
      this._media.forEach(this._cleanupMediaTagObserver);
      delete this._media;
    }
  },

  _onMediaTagReady: function (evt) {
    this._onMediaTagResolved(evt, true);
  },

  _onMediaTagFailed: function (evt) {
    this._onMediaTagResolved(evt, false);
  },

  _onMediaTagResolved: function (evt, ready) {
    var mediaTag = evt.target;
    this._cleanupMediaTagObserver(mediaTag);
    if (!this.props.msg.media_loaded){
      if (!ready){
        mediaTag.style.display = '';
        this.setState({
          failed: true
        });
      } else {
        this._media_count--;
        if (mediaTag.style.display !== ''){
          this._onMediaSizeKnown(mediaTag);
        }
      }
      if (!_.size(this._media)) {
        if (!this._media_count){
          ChatWindowActions.messageMediaLoaded({
            jid: this.props.msg.room,
            mid: this.props.msg.mid
          });
        }
      }
    }
    ChatWindowActions.preserveScrollValue({animation: false});
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/components/mixins/scrolling_media_observer_mixin.js
 **/