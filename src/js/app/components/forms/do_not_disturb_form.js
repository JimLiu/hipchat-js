import AuiRadio from 'components/common/aui/form/aui_radio';
import PreferencesKeys from 'keys/preferences_keys';
import PreferencesActions from 'actions/preferences_actions';
import strings from 'strings/dialog_strings';

export default React.createClass({

  displayName: 'DoNotDisturbForm',

  mixins: [React.addons.PureRenderMixin],

  propTypes: {
    notifyForVideo: React.PropTypes.bool.isRequired,
    notifyAlways: React.PropTypes.bool.isRequired
  },

  _onChange(e) {
    var notify_always = e.target.id === PreferencesKeys.NOTIFY_WHEN_DND,
        notify_for_video = e.target.id === PreferencesKeys.NOTIFY_FOR_VIDEO_WHEN_DND;

    e.stopPropagation();
    PreferencesActions.savePreferences({
      [PreferencesKeys.NOTIFY_FOR_VIDEO_WHEN_DND]: notify_for_video,
      [PreferencesKeys.NOTIFY_WHEN_DND]: notify_always
    });
  },

  render() {
    var true_dnd = !this.props.notifyForMessages && !this.props.notifyForMessages;

    return (
      <form className='aui' onChange={this._onChange}>
        <h3>{strings.dnd_header}</h3>
        <fieldset>
          <AuiRadio
            id='trueDND'
            name='dnd_setting'
            defaultChecked={true_dnd}
            label={strings.do_not_notify_when_dnd} />
          <AuiRadio
            id={PreferencesKeys.NOTIFY_FOR_VIDEO_WHEN_DND}
            name='dnd_setting'
            defaultChecked={this.props.notifyForVideo}
            label={strings.notify_for_video_when_dnd} />
          <AuiRadio
            id={PreferencesKeys.NOTIFY_WHEN_DND}
            name='dnd_setting'
            defaultChecked={this.props.notifyAlways}
            label={strings.notify_when_dnd} />
        </fieldset>
      </form>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/do_not_disturb_form.js
 **/