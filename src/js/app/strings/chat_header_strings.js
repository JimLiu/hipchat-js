export default {
  default_topic: `This is the room topic. Double click to change it.`,
  loading: `Loading…`,
  beta: function(feature){
    return `Still baking! The ${feature} feature is not in the beta, but will be soon.`;
  },
  enso_video: `HipChat Video`,
  room_notifications: `Room Notifications`,
  integrations: `Integrations`,
  create_new_room: `Create New Room…`,
  invite_users: `Invite People`,
  remove_users: `Remove People`,
  disable_guest: `Disable Guest Access`,
  guest_enabled: `Guest Access Enabled`,
  guest_disabled: `Guest Access Disabled`,
  guest_access_on: `Guest Access On`,
  enable_guest: `Enable Guest Access`,
  archive: `Archive`,
  unarchive: `Unarchive`,
  change_topic: `Change Topic`,
  change_privacy: `Change Privacy`,
  delete: `Delete`,
  rename: `Rename`,
  files: `Files`,
  links: `Links`,
  people: `People`,
  room_actions: `Room actions`,
  show_roster: `Show people`,
  hide_roster: `Hide people`,
  show_files: `Show files`,
  hide_files: `Hide files`,
  show_links: `Show links`,
  hide_links: `Hide links`,
  show_integrations: `Show integrations`,
  hide_integrations: `Hide integrations`,
  show_sidebar: `Show sidebar`,
  hide_sidebar: `Hide sidebar`,
  video_call: `Make a video call`,
  audio_call: `Make an audio call`,
  hipchat_video: `AddLive`,
  topic_length_error: function(maxlength) {
    return `Maximum topic length is ${maxlength}.`;
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/strings/chat_header_strings.js
 **/