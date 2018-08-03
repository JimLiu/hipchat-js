import fileHelper from 'helpers/file_helper';
import AppConfig from 'config/app_config';
import ChatWindowActions from 'actions/chat_window_actions';
import AppDispatcher from 'dispatchers/app_dispatcher';
import FileError from 'components/chat_window/message_types/file_error';
import utils from 'helpers/utils';

export default React.createClass({

  displayName: 'FileThumbnail',

  propTypes: {
    file: React.PropTypes.object.isRequired,
    onClick: React.PropTypes.func.isRequired
  },

  getInitialState() {
    return {
      thumbIsLoading: false,
      thumbIsLoaded: false,
      imageIsMounted: false,
      error: null
    };
  },

  componentWillMount() {
    AppDispatcher.register({
      'thumbnail-is-loading': this._thumbnailIsLoading,
      'thumbnail-loaded-success': this._thumbnailLoadedSuccess,
      'thumbnail-loaded-error': this._thumbnailLoadedError
    });

    if (this.props.file.file_type === 'img') {
      this.tryFetchThumbnail(this.props.file);
    }
  },

  componentDidMount() {
    if (this.props.file.file_type === 'img') {
      this._appendThumbnail();
    }
  },

  componentDidUpdate() {
    if (this.props.file.file_type === 'img' && !this.state.imageIsMounted) {
      this._appendThumbnail();
    }
  },

  componentWillUnmount() {
    AppDispatcher.unregister({
      'thumbnail-is-loading': this._thumbnailIsLoading,
      'thumbnail-loaded-success': this._thumbnailLoadedSuccess,
      'thumbnail-loaded-error': this._thumbnailLoadedError
    });
  },

  _thumbnailIsLoading(instance) {
    if (instance === this) {
      this.setState({ thumbIsLoading: true });
    }
  },

  _thumbnailLoadedSuccess (instance) {
    if (instance === this) {
      this.setState({
        thumbIsLoaded: true,
        thumbIsLoading: false,
        error: null
      });
    }
  },

  _thumbnailLoadedError (data) {
    if (data.instance === this) {
      this.setState({
        thumbIsLoaded: true,
        thumbIsLoading: false,
        error: data.error,
        imageIsMounted: false
      });
    }
  },

  _appendThumbnail() {
    let node = ReactDOM.findDOMNode(this.refs.preview_thumbnail_container);
    if(node !== null) {
      node.appendChild(this.props.file.preview_thumbnail);
      this.setState({ imageIsMounted: true });
    }
  },

  render() {
    if(this.state.error) {
      return (
        <FileError code={this.state.error.code}
                   isLoading={this.state.thumbIsLoading}
                   onClick={this.tryFetchThumbnail}></FileError>);
    }

    return (
      <div className="file-preview-wrapper" onClick={this.props.onClick}>
        <a href={this.props.file.url}
           target="_blank"
           title={fileHelper.basename(this.props.file.name)}
           onClick={this._onClick}
           ref="preview_thumbnail_container">
        </a>
      </div>);
  },

  tryFetchThumbnail() {
    this.loadThumbnail().then(() => {
      ChatWindowActions.thumbnailLoadedSuccess(this);
    }, error => {
      error = error || null;

      ChatWindowActions.thumbnailLoadedError({ error, instance: this });
    });
  },

  loadThumbnail() {
    let file = this.props.file;
    let loadThumb = new Promise((resolve, reject) => {
      let timeout = AppConfig.message_image_loading_timeout;

      if (file.preview_thumbnail._isLoaded){
        return Promise.resolve(true);
      }

      if (file.is_authenticated) {
        ChatWindowActions.fetchSignedThumbnail(file, data => {
          utils.image.changeSrc(file.preview_thumbnail, data.temp_url, timeout).then(resolve, reject);
        }, err => {
          if (err.status) {
            let error = {
              code: err.status
            };
            reject(error);
          }
        });
      } else {
        utils.image.changeSrc(file.preview_thumbnail, file.thumb_url, timeout).then(resolve, reject);
      }

      ChatWindowActions.thumbnailIsLoading(this);
    });

    return loadThumb;
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/file_viewer/file_thumbnail.js
 **/