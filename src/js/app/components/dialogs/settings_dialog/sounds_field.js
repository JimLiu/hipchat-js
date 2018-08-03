import strings from 'strings/dialog_strings';
import PreferencesKeys from 'keys/preferences_keys';
import PreferencesActions from 'actions/preferences_actions';
import AuiFormInlineFieldGroup from 'components/common/aui/form/aui_form_inline_fieldgroup';
import AuiCheckbox from 'components/common/aui/form/aui_checkbox';
import cx from 'classnames';

const MESSAGE_SOUNDS = '1';
const VIDEO_SOUNDS = '2';
const ALL_SOUNDS = '3';

export default React.createClass({

  displayName: 'SoundsField',

  mixins: [React.addons.PureRenderMixin],

  propTypes: {
    soundsEnabled: React.PropTypes.bool.isRequired,
    messageSounds: React.PropTypes.bool.isRequired,
    videoSounds: React.PropTypes.bool.isRequired
  },

  componentDidMount() {
    AJS.$(this.refs.dropdown)
      .auiSelect2({
        minimumResultsForSearch: Infinity
      })
      .on('change', this._onSoundPrefChange);
  },

  componentWillUnmount() {
    AJS.$(this.refs.dropdown).off('change').auiSelect2('destroy');
    AJS.$('#select2-drop-mask').remove();
    AJS.$('.select2-sizer').remove();
  },

  _onSoundsEnabledChange(e) {
    e.stopPropagation();
    PreferencesActions.savePreferences({
      [PreferencesKeys.SOUNDS_ENABLED]: !this.props.soundsEnabled
    });
  },

  _onSoundPrefChange(e) {
    var selected = e.target.value;
    e.stopPropagation();

    PreferencesActions.savePreferences({
      [PreferencesKeys.MESSAGE_SOUNDS]: selected === ALL_SOUNDS || selected === MESSAGE_SOUNDS,
      [PreferencesKeys.VIDEO_SOUNDS]: selected === ALL_SOUNDS || selected === VIDEO_SOUNDS
    });
  },

  render() {
    var { soundsEnabled, messageSounds, videoSounds } = this.props,
        message_sounds_selected = messageSounds && !videoSounds ? MESSAGE_SOUNDS : false,
        video_sounds_selected = !messageSounds && videoSounds ? VIDEO_SOUNDS : false,
        all_sounds_selected = messageSounds && videoSounds ? ALL_SOUNDS : false,
        defaultDropDownValue = all_sounds_selected || video_sounds_selected || message_sounds_selected,
        dropDownDisabled = !soundsEnabled,
        classes = cx({
          'sounds-preference': true,
          'checkbox-select2-field': true,
          'disabled': dropDownDisabled
        });

    return (
      <AuiFormInlineFieldGroup className={classes} key={PreferencesKeys.SOUNDS_ENABLED}>
        <div className='checkbox'>
          <AuiCheckbox
            id={PreferencesKeys.SOUNDS_ENABLED}
            defaultChecked={soundsEnabled}
            onClick={this._onSoundsEnabledChange}/>
          <label className='select-title' htmlFor={PreferencesKeys.SOUNDS_ENABLED}>{strings.play_sound_part_1}</label>
          <select
            defaultValue={defaultDropDownValue}
            ref='dropdown'
            disabled={dropDownDisabled}
            aria-disabled={dropDownDisabled}>
              <option value={MESSAGE_SOUNDS}>{strings.message_notifications}</option>
              <option value={VIDEO_SOUNDS}>{strings.video_notifications}</option>
              <option value={ALL_SOUNDS}>{strings.message_and_video_notifications}</option>
          </select>
          <label className='select-title' htmlFor={PreferencesKeys.SOUNDS_ENABLED}>{strings.play_sound_part_2}</label>
        </div>
      </AuiFormInlineFieldGroup>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/settings_dialog/sounds_field.js
 **/