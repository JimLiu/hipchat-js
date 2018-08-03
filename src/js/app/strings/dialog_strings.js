import common from 'strings/common_strings';

export default {
  create_room: `Create room`,
  delete_room: `Delete room`,
  disable_guest: `Disable guest access`,
  join: `Join room`,
  ok: `Ok`,
  OK: `OK`,
  save: `Save`,
  delete: `Delete`,
  close: `Close`,
  cancel: `Cancel`,
  apply: `Apply`,
  rename: `Rename`,
  try_again: `Try again`,
  archive: `Archive`,
  archive_room: `Archive room`,
  unarchive: `Unarchive`,
  unarchive_room: `Unarchive room`,
  confirm_archive: `This will prevent any people from chatting in the room.`,
  confirm_disable_guest: `The room URL will be disabled and current guests will be kicked from the room`,
  confirm_delete: function(room) {
    return `Are you sure you want to delete ${room}?`;
  },
  room_deleted: function(room) {
    return `${room} deleted.`;
  },
  room_archived: `Room archived.`,
  room_unarchived: `Room unarchived.`,
  archive_room_name: function(room) {
    return `Archive ${room}`;
  },
  unarchive_room_name: function(room) {
    return `Unarchive ${room}`;
  },
  really_archive: function(room) {
    return `Are you sure you want to archive the ${room} room?`;
  },
  really_unarchive: function(room) {
    return `Are you sure you want to unarchive the ${room} room?`;
  },
  really_disable_guest: `Are you sure you want to disable guest access?`,
  invite_users: function(room) {
    return `Invite people to ${room}`;
  },
  choose_removed_members: `Remove people`,
  join_room: function(room) {
    return `Join ${room}`;
  },
  rename_room: function(room) {
    return `Rename ${room}`;
  },
  invited_to_join: function(inviter, room) {
    return `${inviter} invited you to join ${room}`;
  },
  disable_guest_fail: `Couldn't disable guest access.`,
  enable_guest_fail: `Couldn't enable guest access.`,
  archive_fail: `Couldn't archive room.`,
  unarchive_fail: `Couldn't unarchive room.`,
  delete_room_fail: `Couldn't delete room.`,
  set_privacy: `Set privacy`,
  notify_for_room: `A message is sent to an open room I'm in`,
  notify_for_private_room: `A message is sent to a private room I'm in`,
  notify_for_tag: `I'm mentioned in a room`,
  notify_for_private: `I receive a private message`,
  play_sound_part_1: `Play sound for`,
  play_sound_part_2: `notifications`,
  basic_play_sound: `Play sound for new messages`,
  message_notifications: `message`,
  video_notifications: `video`,
  message_and_video_notifications: `message and video`,
  show_toasters: `Show a popup`,
  hide_presence_messages: `Show joined/left room messages`,
  use_24_hour_format: `Display time in 24-hour format`,
  hide_gifs_by_default: `Hide gifs by default`,
  hide_attached_cards_by_default: `Hide inline previews by default`,
  replace_text_emoticons: `Turn text emoticons into images`,
  show_unread_divider: `Show divider for unread messages`,
  create_a_new_room: `Create a new room`,
  change_privacy: `Change privacy`,
  theme: `Theme`,
  density: `Text density`,
  chat_view: `Chat view`,
  name_display: `Name display`,
  animated_avatars: `Animated avatars`,
  names: `Name`,
  mentions: `@mention name`,
  light: `Light`,
  dark: `Dark`,
  normal: `Normal`,
  tighter: `Tighter`,
  classic: `Classic`,
  classic_neue: `With avatars`,
  animated: `Show animation`,
  static: `Show as static images`,
  call_from: `Call from`,
  answer: `Answer`,
  decline: `Decline`,
  start_up_with_windows: `Start up with Windows`,
  enable_spell_check: `Enable spell check`,
  enable_autocorrect: `Correct spelling automatically`,
  idle: `Idle`,
  minutes: `minutes`,
  maximum_idle_minutes: `maximum of 99`,
  minimum_idle_minutes: `minimum of 1`,
  keep_popups_visible: `Keeping popups visible until ${common.app_name} is focused`,
  blink_taskbar: `Blinking the taskbar`,
  bounce_icon: `Bounce the dock icon`,
  bounce_icon_once: `once`,
  bounce_icon_forever: `until I look`,
  proxy_settings_description: function (display_name) {
    return `Modify the server that ${common.app_name} connects to by using the ${display_name} Proxy Settings`;
  },
  proxy_settings: function (display_name) {
    return `${display_name} Proxy Settings`;
  },
  title_settings: function (group_name) {
    return `${group_name} Settings`;
  },
  room_notifications: `Room notifications`,
  beta: `Beta`,
  appearance: `Appearance`,
  general: `General`,
  notifications: `Notifications`,
  connection: `Connection`,
  notify_when_header: `Notify me when`,
  notify_rooms_header: `Rooms`,
  notify_for_oto_per_room_enabled: `Notify me for 1-to-1 messages`,
  notify_for_oto: `I receive a 1-to-1 message`,
  dnd_header: `Do not Disturb`,
  do_not_notify_when_dnd: `Stop all notifications`,
  do_not_notify_when_dnd_basic: `Enable notifications while status is set to Do Not Disturb`,
  notify_when_dnd: `Send all notifications`,
  notify_for_video_when_dnd: `Send a notification for video calls only`,
  enable_logging: `Log additional chat data`,
  edit_message: `Edit message`,
  delete_message: `Are you sure? When it's gone, it's gone.`,
  not_editable: function(action) {
    return `It's too late to ${action} this`;
  },
  not_editable_body: function(thresholdInHours) {
    return `We'd all like to re-write history, but it's been more than ${thresholdInHours} hours since this message was sent.`;
  },
  user_joined: function (displayName) {
    return `${displayName} has joined.`;
  },
  user_joined_link: `Go say hi!`,
  suggestions: `SUGGESTIONS`,
  message: `MESSAGE`,
  welcome_to_hipchat: `Welcome to HipChat!`,
  choose_people_to_chat: `Choose a few people to chat with`,
  join_some_rooms: `Join some rooms`,
  introduce_yourself: `Introduce yourself`,
  skip_dialog_button: `Skip`,
  start_button: `Start`,
  next_button: `Next`,
  skip_this_step_button: `Skip this step`,
  finish_and_send_button: `Finish and send message`,
  we_ll_help_you: `We'll help you get started chatting with your team. `,
  this_won_t_take_long: `(This won't take long and is totally worth it.) `,
  lets_put_together_a_list_of_people: `Let's put together a list of a few people you might be chatting with a lot. Choose the people you'd like to meet. `,
  weve_got_a_few_sugg_on_rooms: `We've got a few suggestions on rooms (group chats) to start you off with. You'll discover more, of course, but this is a good place to begin. `,
  you_are_all_set: `You're all set. Write a message (or use ours) introducing yourself to the team. We'll post it in each room you chose. `,
  welcome_messages: function () {
    let welcome_messages = [
      `@here Hey everybody! I'm new here. I'm sure we'll talk more real soon. Just wanted to introduce myself. `,
      `@here Hi there, I just joined and thought I'd introduce myself. `,
      `@here Hi everyone, I'm new here. I just wanted to say hi. Have an (awesome) day! `
    ];
    let randomIndex = _.random(0, welcome_messages.length - 1);
    return welcome_messages[randomIndex];
  },
  got_that_person_down: `Got that 1 person down. `,
  got_those_people_down: function (number) {
    return `Got those ${number} people down. `;
  },
  that_is_a_good_roome_choice: `That's a good room choice. `,
  those_are_some_good_roome_choices: `Those are some good room choices. `,
  use_here_in_tour_message: `Use @here in your message to mention everyone currently in the room. `,
  welcome_message_err: function (value) {
    return `Message max length is ${value} symbols. `;
  }
};



/** WEBPACK FOOTER **
 ** ./src/js/app/strings/dialog_strings.js
 **/