export default {
  show_more: `Show more`,
  show_less: `Show less`,
  failed_message: `Couldn't send`,
  failed_message_retry: `Retry`,
  failed_message_cancel: `Cancel`,
  unconfirmed_message_group: `Sending...`,
  room_doesnt_exist: `This room doesn't exist; it may have been archived or deleted.`,
  integration_does_not_exist: `This addon does not exist; it may have been uninstalled from this room.`,
  user_leave: function(name) {
    return `${name} left the room`;
  },
  user_join: function(name) {
    return `${name} joined the room`;
  },
  user_removed: function(name) {
    return `${name} was removed from the room`;
  },
  user_added: function(name) {
    return `${name} was added to the room`;
  },
  user_leave_reason: function(name, reason) {
    return `${name} left the room (${reason})`;
  },
  user_changed_guest_access: function(name, action) {
    return `${name} ${action} guest access`;
  },
  user_changed_archive_status: function(name, action) {
    return `${name} ${action} the room`;
  },
  generic_message: function (name) {
    return `Message from ${name}`;
  },
  generic_file_message: function (name) {
    return `${name} uploaded a file`;
  },
  generic_file_uploaded_message: function (name, file) {
    return `${name} uploaded ${file}`;
  },
  topic_message: function (name, topic) {
    return `${name} changed the topic to: ${topic}`;
  },
  clear_topic_message: function (name) {
    return `${name} cleared the topic.`;
  },
  room_notification_title: function (sender, room_name) {
    return `${sender} - ${room_name}`;
  },
  oto_notification_title: function (sender) {
    return `${sender}`;
  },
  notification_title_with_group: function (title, group_name) {
    return `${title} (${group_name})`;
  },
  you_have_been_removed: `You have been removed from the room`,
  archived: `archived`,
  unarchived: `unarchived`,
  not_allowed: `guest access unavailable`,
  turned_on: `turned on`,
  turned_off: `turned off`,
  loading_thumbnail: `Loading thumbnail…`,
  loading_image: `Loading image…`,
  image_error: `Failed to load the image`,
  thumbnail_error: `Failed to load thumbnail`,
  image_hidden: `Image hidden`,
  edited: `Edited`,
  message_deleted: `Message deleted`
};


/** WEBPACK FOOTER **
 ** ./src/js/app/strings/chat_panel_strings.js
 **/