import ClientPreferencesKeys from 'keys/client_preferences_keys';
import strings from 'strings/dialog_strings';
import PreferencesActions from 'actions/preferences_actions';
import AuiFormInlineFieldGroup from 'components/common/aui/form/aui_form_inline_fieldgroup';
import AuiCheckbox from 'components/common/aui/form/aui_checkbox';
import cx from 'classnames';

export default React.createClass({
  displayName: 'MacDockBounceFieldType',

  mixins: [React.addons.PureRenderMixin],

  propTypes: {
    bounceIcon: React.PropTypes.bool.isRequired,
    bounceOnce: React.PropTypes.bool.isRequired
  },

  componentDidMount() {
    AJS.$(this.refs.dropdown)
      .auiSelect2({
        minimumResultsForSearch: Infinity
      })
      .on('change.mac-dock-bounce', this._onBounceOnceChange);
  },

  componentWillUnmount() {
    AJS.$(this.refs.dropdown).off('.mac-dock-bounce').auiSelect2('destroy');
    AJS.$('#select2-drop-mask').remove();
    AJS.$('.select2-sizer').remove();
  },

  _onBounceIconChange(e) {
    let data = {
      bounceIcon: e.target.checked
    };

    // If we're unsetting the 'bounceIcon' preference, also set 'bounceOnce'
    // back to the default.
    if (!data.bounceIcon) {
      data.bounceOnce = true;
    }

    e.stopPropagation();

    PreferencesActions.savePreferences(data);
  },

  _onBounceOnceChange(e) {
    let data = {
      bounceOnce: e.target.value === 'once'
    };

    e.stopPropagation();

    PreferencesActions.savePreferences(data);
  },

  render() {
    let { bounceIcon, bounceOnce } = this.props,
        values = {
          once: 'once',
          forever: 'forever'
        },
        defaultDropDownValue = bounceOnce ? values.once : values.forever,
        dropDownDisabled = !bounceIcon,
        classes = cx({
          'mac-dock-bounce-preference': true,
          'checkbox-select2-field': true,
          'disabled': dropDownDisabled
        });

    return (
      <AuiFormInlineFieldGroup className={classes} key={ClientPreferencesKeys.BOUNCE_ICON}>
        <div className="checkbox">
          <AuiCheckbox id={ClientPreferencesKeys.BOUNCE_ICON}
                       defaultChecked={bounceIcon}
                       onClick={this._onBounceIconChange}/>
          <label htmlFor={ClientPreferencesKeys.BOUNCE_ICON}>
            {strings.bounce_icon}
          </label>
          <select defaultValue={defaultDropDownValue}
                  ref="dropdown"
                  disabled={dropDownDisabled}
                  aria-disabled={dropDownDisabled}>
            <option value={values.once}>
              {strings.bounce_icon_once}
            </option>
            <option value={values.forever}>
              {strings.bounce_icon_forever}
            </option>
          </select>
        </div>
      </AuiFormInlineFieldGroup>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/settings_dialog/mac_dock_bounce_field.js
 **/