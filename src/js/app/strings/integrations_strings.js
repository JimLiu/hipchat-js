export default {
  fetch_error: `Couldn't load integrations`,
  retry: `Try again`,
  glance_fetch_error: `Can't load`,
  glance_loading: `Loading...`,
  empty_message_actions: `No actions available`,
  empty_message_actions_title: `There are no actions available for this message.`,
  configure_integrations: `Integrations`,
  add_integrations: `Add integrations`,
  configure_integration: `Configure integration`,
  update_integration: `Update integration`,
  disabled_integrations: `Disabled`,
  update: `Update`,
  the_following_integrations_require_the_latest_version_of_hipchat: `The following integrations require the latest version of HipChat.`,
  active: `Active`,
  pending_updates: `Pending Updates`,
  pending_updates_contact_admin: `The following integrations require a room administrator to approve an update.`,
  pending_global_updates: `Pending Global Updates`,
  pending_global_updates_contact_admin: `The following integrations require a global administrator to approve an update.`,
  install_integrations: `Install integrations`,
  install_new_integrations: `Install new integrations`,
  install_integrations_tooltip_title: `ADD AND CONFIGURE INTEGRATIONS`,
  install_integrations_tooltip_content: `Just so you know, you can always add more integrations, or manage your existing ones here.`,
  got_it: `Got it!`,
  installed_count: function(count) {
    return `${count} installed`;
  },
  pending_updates_count: function(count) {
    return `${count} pending update${count > 1 ? 's' : ''}`;
  },
  integration_failed_to_load: `Unable to load`
};



/** WEBPACK FOOTER **
 ** ./src/js/app/strings/integrations_strings.js
 **/