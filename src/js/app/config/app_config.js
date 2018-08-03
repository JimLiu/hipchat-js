export default {
  analytics_publish_interval: 30000,                  // publish analytics events with this interval
  analytics_save_interval: 3000,                      // save to storage analytics events with this interval
  default_web_server: "www.hipchat.com",              // default web server
  save_preferences_throttle_interval: 5 * 1000,       //the throttle timer for persisting preferences to the server
  max_upload_size: 50,                                //max upload file size in Mb
  file_download_timeout: 10000,                       //timeout for downloading files
  scroll_to_bottom_offset: 5,                         //Scroll to bottom check offset
  frozen_scroll_offset: 100,                          //Offset when we handle frozen scroll case
  chat_scroll_duration: 200,                          //The duration of the autoscroll animation when a new message comes in
  render_twitter_cards: false,                        //Embedded Twitter cards
  chat_room_idle_timeout_minutes: 1,                  //Time to elapse before we begin trimming the history
  chat_room_trim_buffer: 50,                          //The minimum number of messages before beginning to trim
  message_retrieval_chunk_size: 50,                   //Number of messages to request during a history load
  composing_message_linger_timeout: 6000,             //How long "so and so is typing..." messages hang around
  sent_active_message_delay: 2000,                    //Delay for sending "active" message and stop "so and so is typing..."
  sent_composing_message_interval: 3000,              //How often we ping composing state for "so and so is typing..."
  request_participant_presences_timeout: 500,         //Throttle timeout to request all participant presences
  filter_participant_presences_timeout: 5000,
  fetch_room_participants_timeout: 500,
  avatar_loading_timeout: 3000,                       //Load default avatar after this timeout
  set_active_rooms_timeout: 500,                      //Debounce timeout to set activeRooms
  room_participant_page_limit: 500,                   //Set limit for room participant API paging
  message_image_size_check_interval: 100,             //Interval to check naturalHeight till image loading
  message_image_loading_timeout: 10000,               //Time elapsed before image was marked as failed to load.
  message_image_max_size: 8000,                      //Maximum acceptable image size in pixels for images to be rendered as metadata for messages
  max_image_size_for_base64: 6500,
  initial_room_participants_limit: 21,                //Limit room occupant presences on join - count includes the current user
  notification_limit: 5,                              //limit unique OS notifications
  leave_room_message_confirmation_timeout: 10 * 1000, //Time elapsed before showing "user left the room" message
  input_history_max: 50,                              // Maximum number of saved input history items
  chat_history_fetching_attempts: 5,                  // How many times we are trying re-fetch history on error
  chat_history_fetching_attempt_timeout: 60 * 1000,   // Timeout on history re-fetching on error
  default_message_confirmation_timeout: 75 * 1000,    //Time elapsed before considering an non-echoed message failed
  flaky_network_message_timeout: 12 * 1000,           //Time it takes to show the user that something's up
  reconnect_failures_before_showing_banner: 5,        //Number of reconnection failures before showing "can't connect" header banner
  flag_close_animation_time: 1000,                    //Time for flag closing animation to complete
  notify_sound_asset: "assets/audio/notify",          //Url to notify sound asset
  incoming_sound_asset: "assets/audio/incoming_call", //Url to incoming call sound asset
  outgoing_sound_asset: "assets/audio/outgoing_call", //Url to outgoing call sound asset
  new_hotness_image_asset: "assets/img/embedded/new-hotness.gif",
  new_hotness_native_asset: "assets/img/embedded/new-hotness-no-animation.png",
  help_link_url: 'https://help.hipchat.com',
  get_started_url: 'https://confluence.atlassian.com/get-started-with-hipchat/get-started-with-hipchat-854033505.html',
  feedback_issue_url: 'https://jira.atlassian.com/secure/CreateIssue.jspa?pid=18110&issuetype=10000',
  status_page_url: 'https://status.hipchat.com/',
  notification_close_timeout: 5000,                   //The duration that desktop notifications hang around
  message_filter_predicate: _.constant(true),         //An optional predicate to filter messages
  outgoing_message_filter_predicate: _.constant(true),//An optional predicate to filter outgoing messages
  notification_banner_slide: 200,                     //The duration of the notification banner slide
  notification_title_max_character_length: 33,        //The max character length for browser notification titles
  notification_icon: 'assets/img/embedded/notification.png',
  notification_attach_to_reorder_limit_mins: 5,       //The max number of minutes to allow an attached notification to be reordered next to the original.
                                                      //If time is greater, it will appear at the time it was sent.
  fetching_files_limit: 100,                          //Limit of files that we receive on history call
  fetching_links_limit: 100,                          //Limit of links that we receive on history call
  fetch_thumbnails_timeout: 100,                      //Timeout for thumbnails fetching (ms)

  shades_icon: 'assets/img/embedded/shades.png',
  select2_max_displayed_items: 20,                    //Select2 autocomplete maximum displayed items in dropdown list
  favicon_bg_color: '#707070',                        //Background color for the favicon notification badge
  default_backdrop_dismiss_on_click: true,            //A click on backdrop will dismiss modal dialog
  default_theme: 'light',
  default_density: 'normal',
  default_chat_view: 'classic_neue',
  default_name_display: 'names',
  default_animated_avatars: 'animated',
  default_notification_level: 'loud',
  chat_input_id: 'hc-message-input',                  //Id attribute value for chat input
  favicon_bg_color_with_mention: '#3873AE',           //Background color for the favicon notification badge, when the user is mentioned
  slash_replacement_regex: new RegExp('^s/([^/]+)/([^/]*)/?$'),    //S-slash command replacement regex
  integrations_base_url: 'https://{base_url}/addons',  // Integrations base url
  integrations_url: 'https://{base_url}/rooms/addons/{room_id}?required_user={user_id}&from_location_id={from_location_id}&source_id={source_id}', // URL used to install integrations in a room (use IntegrationHelper.getIntegrationsUrl())
  integrations_config_url: 'https://{base_url}/addons/{addon_key}?room={room_id}', // URL used to configure integration in a room
  integrations_update_url: 'https://{base_url}/addons/{addon_key}?room={room_id}&update=true', // URL used to configure integration in a room
  column_width_limits: {                              //Column width limits
    left: {
      max: 450,
      min: 95,
      default: 220
    },
    right: {
      max: 450,
      min: 95,
      default: 200
    }
  },
  video_width: 960,
  video_height: 540,
  min_video_width: 640,
  min_video_height: 360,
  default_connect_dialog_height: 400,                 //connect dialog default height
  default_connect_dialog_width: 600,                   //connect dialog default width
  connect_aui_dialog_chrome_height: 122,                 //connect dialog AUI header / footer combined height
  default_connect_aui_dialog_vertical_mergin: 170,      //connect dialog default distance from the top of the window
  onboarding: {
    rooms_threshold: 5,
    oto_threshold: 5
  },
  login_page_redirect_regex: new RegExp('(log|sign)[_\-]?in',"gi"), //if in app search redirects user to sign_in page we check the iframe location and handle apprpriately
  emoticon_regex: new RegExp(/[^\(a-zA-Z0-9\-\:'=]+/),
  emote_regex: /^(\/me\s|\/em\s)/,
  quote_regex: /^(\/quote\s)/,
  code_regex: /^(\/code\s)/,
  pre_regex: /^(\/pre\s*|\/monospace\s*)/,
  core_mentions: [
    {
      mention_name: "all",
      name: 'All room members',
      isUser: false,
      jid: 'all@chat' // to pass utils.jid.is_private_chat (is person)
    },
    {
      mention_name: "here",
      name: 'Available room members',
      isUser: false,
      jid: 'here@chat' // to pass utils.jid.is_private_chat (is person)
    },
    {
      mention_name: "HipChat",
      name: 'HipChat',
      isUser: true,
      jid: 'hipchat@chat' // to pass utils.jid.is_private_chat (is person)
    }
  ],
  spinner_colors: {
    light: '#000000',  // Default color for loading spinner
    dark: '#c7c7c7'   // Loading spinner color for dark mode
  },
  missed_video_call_timeout: 30000,
  default_group_avatar_bg: "#59afe1",
  default_guest_avatar_bg: "#cccccc",
  delayed_video_message_timeout: 3000,
  max_message_text_length: Math.pow(2, 15),  // Max message length - matches backend limit
  max_file_description_length: 1000,         // Max file description length - matches backend limit
  max_topic_text_length: 250,                // Max topic length - too many characters cause crashes
  max_presence_text_length: 1024,
  integrations: {
    persistent_store_max_size_bytes: 100 * 1024, // 100KB in bytes
    glance_remote_metadata_timeout: 10000,
    loading_indicator_delay_ms: 100,
    signed_url_timeout: 2000,
    spinner_delay: 100
  },
  dialog: {
    max_size_margin: 160,
    filter_debounce_wait: 250
  },
  modal_transition_allowance: 250,
  people_glance: {
    full_key: "atlassian.hipchat.internal.people:people",
    addon_key: "atlassian.hipchat.internal.people",
    addon_version: "internal.people.1",
    key: "people",
    name: "Members",
    target: "people",
    type: "glance",
    icon: {
      aui_icon: "aui-icon aui-icon-small aui-iconfont-group"
    },
    weight: 0,
    internal: true,
    max_items_to_render_collapsed: 24
  },
  files_glance: {
    full_key: "atlassian.hipchat.internal.files:files",
    addon_key: "atlassian.hipchat.internal.files",
    addon_version: "internal.files.1",
    key: "files",
    name: "Files",
    target: "files",
    type: "glance",
    icon: {
      aui_icon: "hipchat-icon-small icon-file"
    },
    weight: 1,
    internal: true
  },
  links_glance: {
    full_key: "atlassian.hipchat.internal.links:links",
    addon_key: "atlassian.hipchat.internal.links",
    addon_version: "internal.links.1",
    key: "links",
    name: "Links",
    target: "links",
    type: "glance",
    icon: {
      aui_icon: "hipchat-icon-small icon-link"
    },
    weight: 2,
    internal: true
  },
  max_unread_count: 99,
  default_avatar_colors: [ // Used to identify the default group avatar
    '#88d3ff',
    '#59afe1',
    '#2774a0',
    '#1a8cff',
    '#b2e020',
    '#8eb021',
    '#2f7a0e',
    '#0bbe30',
    '#14892c',
    '#005812',
    '#fe5e50',
    '#d04437',
    '#88170c',
    '#f6c342',
    '#f79232',
    '#b05600',
    '#d39c3f',
    '#815b3a',
    '#594300',
    '#a659f5',
    '#654982',
    '#3d1368',
    '#f691b2',
    '#f15c75',
    '#be1733',
    '#ff4f92',
    '#ff0d6e',
    '#b3003e',
    '#ffe400',
    '#ffae00',
    '#00d2ff',
    '#0096ff',
    '#d84dff',
    '#b400ff',
    '#7e00ff',
    '#ffd200',
    '#ff7f00',
    '#ff2f00'
  ],
  tipsify: {
    window_margin: 10,
    distance: 5,
    delay: 300,
    max_dom_traverse_depth: 3
  },
  cards: {
    feedback_url: 'https://docs.google.com/a/atlassian.com/forms/d/1vcNJHyni4mCwwljRskil_Xdz9o_ssgxeu-cD0pmv1ts/viewform?entry.640157496='
  },
  guest_access_information: {
    focus_and_select_delay: 200,
    mouseout_delay: 300
  },
  roster_panel: {
    group_title_item_height: 39,
    person_item_height: 26,
    breakpoints: {
      small: 20,
      medium: 100,
      large: 500,
      xlarge: Infinity
    }
  },
  edit_message_threshold: 1000 * 60 * 60 * 24, // amount of time (in milliseconds) that we will allow users to edit/delete messages
  max_users_in_group_join_notification: 10, // max number of users in group that will get client notification, that new user joined
  welcome_dialog: {
    max_size_of_group_to_display: 5,
    max_displayed_people: 4,
    max_displayed_rooms: 4,
    max_amount_of_people_icons: 6,
    max_length_of_welcome_message: 150,
  },
  alert_flag_poll_interval: 1000 * 60 * 10
};



/** WEBPACK FOOTER **
 ** ./src/js/app/config/app_config.js
 **/