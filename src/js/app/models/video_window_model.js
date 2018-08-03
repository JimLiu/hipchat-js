import VideoActions from 'actions/video_actions';

import postis from 'postis';

/** class representing an instance of a video window */
export default class VideoWindow {

  /**
   * Create the video window
   *
   * @param {string} url - the url to point the external window to
   * @param {string} name - the name of the external window
   * @param {string} props - the properties of the external window,
   *                         such as 'resizable=yes,width=${width},height=${height},top=${pos.top},left=${pos.left}'
   * @param {string} passedWindow - optional, a prepared window already opened
   */
  constructor(url, name, props, passedWindow) {
    if (passedWindow) {
      this.window = passedWindow;
      this.window.location = url;
    } else {
      this.window = window.open(url, name, props);
    }
    this._initializeXDM();
    this._startClosedInterval();
  }

  /**
   * Focus the window
   * @method focus
   */
  focus() {
    this.window.focus();
  }

  /**
   * Close the window
   * @method close
   */
  close() {
    clearInterval(this._closedInterval);
    this.window.close();
    this._xdmChannel.destroy();
    VideoActions.destroyVideoSession();
  }

  /**
   * Initialize the cross-domain message bridge
   * @method _initializeXDM
   * @private
   */
  _initializeXDM() {
    this._xdmChannel = postis({
      window: this.window
    });

    this._xdmChannel.ready(() => {
      this._xdmChannel.listen('video-conference-joined', () => {
        VideoActions.videoConferenceJoined();
      });
      this._xdmChannel.listen('video-conference-left', () => {
        VideoActions.videoConferenceLeft();
      });
      this._xdmChannel.listen('video-ready-to-close', () => {
        this.close();
      });
    });
  }

  /**
   * Start the interval to check if the external window has been closed
   * @method _startClosedInterval
   * @private
   */
  _startClosedInterval() {
    this._closedInterval = setInterval(videowindow => {
      if (!videowindow.window) {
        clearInterval(videowindow._closedInterval);
      } else if (_.get(videowindow, 'window.closed')) {
        videowindow.close();
        clearInterval(videowindow._closedInterval);
      }
    }, 1000, this);
  }
}



/** WEBPACK FOOTER **
 ** ./src/js/app/models/video_window_model.js
 **/