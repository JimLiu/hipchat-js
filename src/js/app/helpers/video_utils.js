import {
  video_width, video_height,
  min_video_width, min_video_height
} from 'config/app_config';

var video_utils = {

  isVideoLink: function(link) {
    // Using the global HC object here because importing the ConfigStore throws an error
    //  TypeError: "Super expression must either be null or a function, not object"
    var base_url = _.get(window, 'HC.ApplicationStore.data.config.video_base_url', '').replace(/https?\:\/\//, '');

    var whitelist = [
      'hipchat.com/video/join',
      'hipchat.me',
      'enso.me/join'
    ];

    if (base_url && whitelist.indexOf(base_url) === -1) {
      whitelist.unshift(base_url);
    }

    for (var i = 0; i < whitelist.length; i++) {
      let video_url = whitelist[i].replace(/\/join$/, '/(join|call|meeting)'),
          video_re = new RegExp('^(https?://)?(www\\.)?' + video_url + '/.*', 'i');

      if (video_re.test(link)) {
        return true;
      }
    }

    return false;
  },

  get_video_window_props: function() {
    var window_size = video_utils.size_window(video_width, video_height, min_video_width, min_video_height),
        width = window_size.width,
        height = window_size.height;

    var width_ratio = width / video_width;
    var height_ratio = height / video_height;

    if (width_ratio < 1 && height_ratio < 1) {
      if (width_ratio < height_ratio) {
        width = Math.floor(video_width * height_ratio);
      } else {
        height = Math.floor(video_height * width_ratio);
      }
    } else if (height_ratio < 1) {
      width = Math.floor(video_width * height_ratio);
    } else if (width_ratio < 1) {
      height = Math.floor(video_height * width_ratio);
    }
    var pos = video_utils.center_window(width, height);

    return `resizable=yes,width=${width},height=${height},top=${pos.top},left=${pos.left}`;
  },

  size_window: function (target_w, target_h, min_w, min_h) {
    var max_ratio = 0.9;
    return {
      width: Math.max(Math.min(Math.floor(window.screen.availWidth * max_ratio), target_w), min_w || 100),
      height: Math.max(Math.min(Math.floor(window.screen.availHeight * max_ratio), target_h), min_h || 100)
    };
  },

  center_window: function (width, height) {
    var w = window,
        s = w.screen,
        screenLeft = (w.screenLeft !== null && w.screenLeft !== undefined) ? w.screenLeft : s.left,
        screenTop = (w.screenTop !== null && w.screenTop !== undefined) ? w.screenTop : s.top;
    return {
      left: Math.floor((s.availWidth - width) / 2) + screenLeft,
      top: Math.floor((s.availHeight - height) / 3) + screenTop
    };
  }

};

export default video_utils;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/video_utils.js
 **/