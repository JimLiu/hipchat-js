export default {
  incoming_call_notification: function (name) {
    return `Incoming call from ${name}`;
  },
  missed_call_message: function (name) {
    return `Missed call from ${name}`;
  },
  join_video_call_message: `Join me in a video call`,
  confirm_leave: `Leave your current video call?`,
  call_status: `On a call`,
  connecting: `Connecting to video call…`,
  popups_blocked: `Please enable popups and try again`,
  answer: `Answer`,
  ignore: `Ignore`,
  enso_to_addlive: function(url) {
    return `I'm calling you using the new HipChat video experience, but you need to update your HipChat app to see it. You can still join the meeting in your browser: ${url}`;
  },
  call_declined: {
    offline: function(name) {
      return `It looks like ${name} isn't available to accept video calls at the moment.`;
    },
    on_a_call: function(name) {
      return `${name} is currently in another video call`;
    },
    decline: function(name) {
      return `${name} declined to join the video call`;
    },
    unsupported: function(name) {
      return `${name} is using a HipChat client that doesn't support video calls`;
    }
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/strings/video_call_strings.js
 **/