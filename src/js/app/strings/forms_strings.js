import common from 'strings/common_strings';

export default {
  description: {
    create_room_description: `Name your room after your team, project, or anything really.`,
    create_room_topic: `Tell people what this room is about.`,
    privacy: `Everyone already here will still have access. To add more people, you'll have to invite them.`,
    public_room: `Anyone on your team can join this room and invite others.`,
    private_room: `Only people invited to this room may join.`,
    choose_people_to_remove: `Choose people to remove from this room:`,
    notif_header_prefix: `Customize notifications for: `,
    notif_settings_info_prefix: `You can also change your `,
    notif_settings_link: `default settings`,
    notif_settings_info_suffix: ` for all rooms.`,
    notif_default: `Change your default in Settings`,
    notif_loud: `For every message`,
    notif_normal: function (mention) {
      return `For @all, @here, and @${mention} mentions only`;
    },
    notif_quiet: function (mention) {
      return `For @${mention} mentions only`;
    }
  },
  label: {
    room_name: `Room name:`,
    room_topic: `Topic:`,
    these_people: `These people:`,
    message: `Message:`,
    new_room_name: `New room name:`,
    public_room: `Open room`,
    private_room: `Private room`,
    global: `Global`,
    default_text: `Default:`,
    custom: `Custom`,
    loud: common.loud,
    normal: common.normal,
    quiet: common.quiet
  },
  button: {
    try_again: `Try again`
  },
  success: {
    users_invited: `People invited.`,
    users_removed: `People removed.`,
    rename_flag: `Room renamed.`,
    privacy_changed: function(room, privacy) {
      return `${room} is now ${privacy}.`;
    },
    room_created: function(name) {
      return `${name} created.`;
    }
  },
  fail: {
    invite_fail: `Couldn't invite people.`,
    remove_users: `Couldn't remove people.`,
    no_users_flag: `Choose someone to remove.`,
    rename_flag: `Couldn't rename the room.`,
    create_room: `Couldn't create the room.`,
    change_privacy_flag: `Couldn't change the room privacy.`,
    sent_message_in_archived_room: `Messages cannot be sent in archived rooms.`,
    message_too_long: `Message too long.`,
    file_description_too_long: `Message too long. It can't be more than 1000 characters.`,
    oto_chats_disabled: `1-1 (private) chats are disabled by the administrator.`
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/strings/forms_strings.js
 **/