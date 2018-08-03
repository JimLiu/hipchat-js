/*global HC*/
import ModalDialog from 'components/common/modal_dialog/modal_dialog';
import NavPanel from 'components/common/nav_panel/nav_panel';
import NavPanelContent from 'components/common/nav_panel/nav_panel_content';
import PreferenceCheckboxField from './preference_checkbox_field';
import PreferenceRadioField from './preference_radio_field';
import ConfigStore from 'stores/configuration_store';
import PreferencesStore from 'stores/preferences_store';
import PreferencesActions from 'actions/preferences_actions';
import PreferencesKeys from 'keys/preferences_keys';
import strings from 'strings/dialog_strings';
import ClientPreferencesKeys from 'keys/client_preferences_keys';
import AuiFormInlineFieldGroup from 'components/common/aui/form/aui_form_inline_fieldgroup';
import AuiInputFieldGroup from 'components/common/aui/form/aui_input_fieldgroup';
import MacDockBounceField from 'components/dialogs/settings_dialog/mac_dock_bounce_field';
import SoundsField from 'components/dialogs/settings_dialog/sounds_field';
import GlobalRoomNotificationsForm from 'components/forms/global_room_notifications_form';
import DoNotDisturbForm from 'components/forms/do_not_disturb_form';
import utils from 'helpers/utils';
import spi from 'spi';

export default React.createClass({

  displayName: 'SettingsDialog',

  componentDidMount() {
    PreferencesStore.on('change', this._onChange);
    ConfigStore.on('change', this._onChange);
    document.querySelector('body').addEventListener('keydown', this._onKeyDown);
  },

  componentWillUnmount() {
    PreferencesStore.off('change', this._onChange);
    ConfigStore.off('change', this._onChange);
    document.querySelector('body').removeEventListener('keydown', this._onKeyDown);
  },

  _onChange() {
    this.setState(this._getState());
    this.setState({dirty: true});
  },

  getInitialState() {
    let initState = this._getState(),
        otherDefaults = {
          errors: {},
          dirty: false
        };

    return _.merge(initState, otherDefaults);
  },

  _getState() {
    let prefs = {},
        preferences = PreferencesStore.getAll();

    _.assign(prefs, preferences, {
      feature_flags: ConfigStore.get('feature_flags'),
      client_subtype: ConfigStore.get('client_subtype'),
      display_name: ConfigStore.get('display_name'),
      group_name: ConfigStore.get('group_name')
    });

    return prefs;
  },

  //TODO: Remove client subtype checks and let wrappers tell the web client what to display
  /**
   * Check for when items need to be Windows-specific
   * @returns {boolean}
   * @private
   */
  _isWindows() {
    return utils.clientSubType.isWindows(this.state.client_subtype);
  },

  /**
   * Check for when items need to be Linux-specific
   * @returns {boolean}
   * @private
   */
  _isLinux() {
    return utils.clientSubType.isLinux(this.state.client_subtype);
  },

  /**
   * Check for when items need to be Mac-specific
   * @returns {boolean}
   * @private
   */
  _isMac() {
    return utils.clientSubType.isMac(this.state.client_subtype);
  },

  /**
   * Check for when items belong any native flavor
   * @returns {boolean}
   * @private
   */
  _isNative() {
    return utils.clientSubType.isNative(this.state.client_subtype);
  },

  _getGeneralPanel() {
    let generalPanelNativeOptions = this._getGeneralPanelNativeOptions();
    let attachedCardsOption = this._getAttachedCardsOption();

    return (
      <NavPanelContent name={strings.general} key="general-settings-panel">
        <form className='aui' onSubmit={this._onSubmit}>
          <PreferenceCheckboxField id={PreferencesKeys.HIDE_PRESENCE_MESSAGES}
            label={strings.hide_presence_messages}
            value='false'
            isReverse={true} />
          <PreferenceCheckboxField id={PreferencesKeys.USE_24_HR_FORMAT}
            label={strings.use_24_hour_format} />
          {attachedCardsOption}
          <PreferenceCheckboxField id={ClientPreferencesKeys.HIDE_GIFS_BY_DEFAULT}
            label={strings.hide_gifs_by_default} />
          <PreferenceCheckboxField id={ClientPreferencesKeys.REPLACE_TEXT_EMOTICONS}
            label={strings.replace_text_emoticons} />
          <PreferenceCheckboxField id={ClientPreferencesKeys.SHOW_UNREAD_DIVIDER}
            label={strings.show_unread_divider} />
          {generalPanelNativeOptions}
        </form>
      </NavPanelContent>
    );
  },

  _getGeneralPanelNativeOptions() {
    let nativeOptions = [];

    if (this._isWindows()) {
       nativeOptions.push(this._getWindowsGeneralOptions());
    }
    if (this._isNative()) {
      nativeOptions.push(this._getNativeGeneralOptions());
    }
    if (this._isMac()) {
      nativeOptions.push(this._getMacGeneralOptions());
    }
    return nativeOptions;
  },

  _getAttachedCardsOption() {
    if (_.get(this.state.feature_flags, 'web_client_attach_to_collapsable_enabled')) {
      return <PreferenceCheckboxField
        id={ClientPreferencesKeys.HIDE_ATTACHED_CARDS_BY_DEFAULT}
        label={strings.hide_attached_cards_by_default}/>;
    }
    return undefined;
  },

  _getWindowsGeneralOptions() {
    return [
      <PreferenceCheckboxField id={ClientPreferencesKeys.LAUNCH_WITH_OS_STARTUP} label={strings.start_up_with_windows} />
    ];
  },

  _getMacGeneralOptions() {
    return [
      <PreferenceCheckboxField id={ClientPreferencesKeys.ENABLE_AUTOCORRECT} label={strings.enable_autocorrect} />
    ];
  },

  _getNativeGeneralOptions() {
    return [
      <AuiFormInlineFieldGroup>
        <PreferenceCheckboxField
          id={PreferencesKeys.ENABLE_IDLE}
          label={strings.idle} />
        <AuiInputFieldGroup
          id={PreferencesKeys.IDLE_MINUTES}
          key={PreferencesKeys.IDLE_MINUTES}
          label={strings.minutes}
          labelPosition='right'
          size='short-field'
          defaultValue={this.state[PreferencesKeys.IDLE_MINUTES]}
          error={this.state.errors[PreferencesKeys.IDLE_MINUTES]}
          type='text'
          onChange={this._trackUnsavedChanges}
          onBlur={this._onPreferenceChanged} />
      </AuiFormInlineFieldGroup>,
      <PreferenceCheckboxField id={ClientPreferencesKeys.ENABLE_LOGGING} label={strings.enable_logging} />,
      <PreferenceCheckboxField id={ClientPreferencesKeys.ENABLE_SPELL_CHECK} label={strings.enable_spell_check} />
    ];
  },

  _getAppearancePanel() {
    let panel = <span name={strings.appearance}></span>;
    let animated_avatars = null;

    if (ConfigStore.get('feature_flags').web_client_freeze_gifs) {
      animated_avatars = (
        <PreferenceRadioField id={ClientPreferencesKeys.ANIMATED_AVATARS}
          label={strings.animated_avatars}
          options={PreferencesStore.getAnimatedAvatarsOptions()} />
      );
    }

    if ((this.state.feature_flags && this.state.feature_flags.web_client_appearance_settings) || HC.ENV !== 'production' || this._isNative()) {
      panel = (
        <NavPanelContent name={strings.appearance} key="appearance-settings-panel">
          <form className='aui'>
            <PreferenceRadioField id={PreferencesKeys.THEME}
              label={strings.theme}
              options={PreferencesStore.getThemeOptions()} />
            <PreferenceRadioField id={PreferencesKeys.DENSITY}
              label={strings.density}
              options={PreferencesStore.getDensityOptions()} />
            <PreferenceRadioField id={PreferencesKeys.CHAT_VIEW}
              label={strings.chat_view}
              options={PreferencesStore.getChatViewOptions()} />
            <PreferenceRadioField id={PreferencesKeys.NAME_DISPLAY}
              label={strings.name_display}
              options={PreferencesStore.getNameDisplayOptions()} />
            {animated_avatars}
          </form>
        </NavPanelContent>
      );
    }

    return panel;
  },

  _getNotificationsPanel() {
    var video_enabled = _.get(this.state, 'feature_flags.web_client_video_chat', false),
        room_notifications_enabled = _.get(this.state, 'feature_flags.web_client_per_room_notifications', false),
        room_notification_settings = this._getRoomNotificationSettings(room_notifications_enabled),
        native_notification_settings = this._getNativeNotificationSettings(),
        sounds_field = this._getSoundsField(video_enabled),
        dnd_with_video,
        notify_when_dnd,
        notify_for_oto;

    if (room_notifications_enabled) {
      notify_for_oto = (
        <PreferenceCheckboxField
          id={PreferencesKeys.NOTIFY_FOR_PRIVATE}
          label={strings.notify_for_oto_per_room_enabled} />
      );
    }

    if (video_enabled) {
      dnd_with_video = (
        <DoNotDisturbForm
          notifyForVideo={this.state[PreferencesKeys.NOTIFY_FOR_VIDEO_WHEN_DND]}
          notifyAlways={this.state[PreferencesKeys.NOTIFY_WHEN_DND]} />
      );
    } else {
      notify_when_dnd = (
        <PreferenceCheckboxField
          id={PreferencesKeys.NOTIFY_WHEN_DND}
          label={strings.do_not_notify_when_dnd_basic} />
      );
    }

    return (
      <NavPanelContent name={strings.notifications} key="notifications-settings-panel">
        <form className='aui'>
          {sounds_field}
          {notify_for_oto}
          {native_notification_settings}
          <PreferenceCheckboxField
            id={PreferencesKeys.SHOW_TOASTERS}
            label={strings.show_toasters} />
          {notify_when_dnd}
        </form>
        {room_notification_settings}
        {dnd_with_video}
      </NavPanelContent>
    );
  },

  _getSoundsField(video_enabled) {
    var sounds_field;
    if (video_enabled) {
      sounds_field = (
        <SoundsField
          soundsEnabled={this.state[PreferencesKeys.SOUNDS_ENABLED]}
          messageSounds={this.state[PreferencesKeys.MESSAGE_SOUNDS]}
          videoSounds={this.state[PreferencesKeys.VIDEO_SOUNDS]} />
      );
    } else {
      sounds_field = (
        <PreferenceCheckboxField
          id={PreferencesKeys.SOUNDS_ENABLED}
          label={strings.basic_play_sound} />
      );
    }
    return sounds_field;
  },

  _getRoomNotificationSettings(room_notifications_enabled) {
    if (room_notifications_enabled) {
      return <GlobalRoomNotificationsForm />;
    }

    return (
      <form className='aui'>
        <h3>{strings.notify_when_header}</h3>
        <PreferenceCheckboxField id={PreferencesKeys.NOTIFY_FOR_ROOM}
          label={strings.notify_for_room} />
        <PreferenceCheckboxField id={PreferencesKeys.NOTIFY_FOR_PRIVATE_ROOM}
          label={strings.notify_for_private_room} />
        <PreferenceCheckboxField id={PreferencesKeys.NOTIFY_FOR_TAG}
          label={strings.notify_for_tag} />
        <PreferenceCheckboxField id={PreferencesKeys.NOTIFY_FOR_PRIVATE}
          label={strings.notify_for_oto} />
      </form>
    );
  },

  _getNativeNotificationSettings() {
    if (this._isWindows()) {
      return [
        <PreferenceCheckboxField id={ClientPreferencesKeys.KEEP_POPUPS_VISIBLE}
          label={strings.keep_popups_visible} />,
        <PreferenceCheckboxField id={ClientPreferencesKeys.BLINK_TASKBAR}
          label={strings.blink_taskbar} />
      ];
    } else if (this._isLinux()) {
      return [
        <PreferenceCheckboxField id={ClientPreferencesKeys.KEEP_POPUPS_VISIBLE}
          label={strings.keep_popups_visible} />
      ];
    } else if (this._isMac()) {
      return [
        <MacDockBounceField
          bounceIcon={this.state.bounceIcon}
          bounceOnce={this.state.bounceOnce}/>
      ];
    }
  },

  _getConnectionPanel() {
    return (
      <NavPanelContent name={strings.connection} key="connection-settings-panel">
        <p>{strings.proxy_settings_description(this.state.display_name)}</p><br />
        <button
          className='aui-button aui-button-primary'
          aria-disabled={this.props.btnLoading}
          onClick={this._onClickProxySettings}>
          {strings.proxy_settings(this.state.display_name)}
        </button>
      </NavPanelContent>
    );
  },

  _dialogBody() {
    let generalPanel = this._getGeneralPanel(),
        appearancePanel = this._getAppearancePanel(),
        notificationsPanel = this._getNotificationsPanel(),
        connectionPanel = this._getConnectionPanel(),
        navPanelContent = [
          generalPanel,
          appearancePanel,
          notificationsPanel
        ];

    if (this._isWindows()) {
      navPanelContent.push(connectionPanel);
    }

    return (
      <NavPanel
        onChange={this._onPreferenceChanged}
        defaultTab={this.props.activeTab}>
        {navPanelContent}
      </NavPanel>
    );
  },

  trackedPreferences: {},

  _trackUnsavedChanges(e) {
    e.stopPropagation();
    this.trackedPreferences[e.target.id] = e.target.value;
  },

  _onKeyDown(e) {
    var key = window.Event ? e.which : e.keyCode;

    if (key === utils.keyCode.Esc) {
      _.forEach(this.trackedPreferences, (value, id) => {
        let target = {
          id: id,
          value: value,
          type: 'text'
        };
        this._onPreferenceChanged({ target: target });
      });
    }
  },

  _getPreference(target) {
    let pref = {};

    switch(target.type) {
      case 'radio':
        let checked = document.querySelector(`input[name='${target.name}']:checked`);
        pref[target.name] = checked.id;
      break;
      case 'checkbox':
        let value = (target.value === 'true');
        pref[target.id] = (target.checked) ? value : !value;
      break;
      case 'text':
        pref[target.id] = target.value;
      break;
    }

    return pref;
  },

  _onPreferenceChanged(e) {
    let target = e.target,
        preference = this._getPreference(target),
        formValidated = this._validate(target);

    if (formValidated) {
      PreferencesActions.savePreferences(preference);
      spi.onPreferencesUpdated(preference);
    }
  },

  _validate(target) {
    let value = target.value;

    if (Object.keys(this.state.errors).length) {
      this._clearErrors();
    }

    if (target.id === PreferencesKeys.IDLE_MINUTES) {
      if (!+value) {
        this.setState({
          errors: {
            [PreferencesKeys.IDLE_MINUTES]: strings.minimum_idle_minutes
          }
        });
        return false;
      } else if (+value < 0) {
        this.setState({
          errors: {
            [PreferencesKeys.IDLE_MINUTES]: strings.minimum_idle_minutes
          }
        });
        return false;
      } else if (+value > 99) {
        this.setState({
          errors: {
            [PreferencesKeys.IDLE_MINUTES]: strings.maximum_idle_minutes
          }
        });
        return false;
      }
    }

    return true;
  },

  _clearErrors() {
    this.setState({
      errors: {}
    });
  },

  _onSubmit(e) {
    e.preventDefault();
  },

  _onClickProxySettings() {
    if (spi.buttonClickedProxySettings) {
      spi.buttonClickedProxySettings();
    }
  },

  render() {
    return (
      <ModalDialog
        dialogId='settings-dialog'
        title={strings.title_settings(this.state.group_name)}
        dialogBody={this._dialogBody}
        noCloseLink />
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/settings_dialog/settings_dialog.js
 **/