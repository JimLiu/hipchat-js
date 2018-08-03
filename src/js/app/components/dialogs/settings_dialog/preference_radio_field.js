import AuiRadio from 'components/common/aui/form/aui_radio';
import PreferencesStore from 'stores/preferences_store';
import PreferencesKeys from 'keys/preferences_keys';
import ClientPreferencesKeys from 'keys/client_preferences_keys';
import strings from 'strings/dialog_strings';
import AnalyticsActions from 'actions/analytics_actions';

module.exports = React.createClass({

  displayName: "PreferenceRadioField",

  propTypes: {
    options: React.PropTypes.array,
    label: React.PropTypes.string
  },

  getDefaultProps: function() {
    return {
      options: []
    };
  },

  _isDefaultChecked: function(val) {
    return val === PreferencesStore.get(this.props.id);
  },

  _handleAnalytics: function (option) {
    switch (this.props.id) {
      case PreferencesKeys.THEME:
        this._handleThemeClicked(option);
        break;
      case PreferencesKeys.DENSITY:
        this._handleDensityClicked(option);
        break;
      case PreferencesKeys.CHAT_VIEW:
        this._handleChatViewClicked(option);
        break;
      case PreferencesKeys.NAME_DISPLAY:
        this._handleNameDisplayClicked(option);
        break;
      case ClientPreferencesKeys.ANIMATED_AVATARS:
        this._handleAnimatedAvatarsClicked(option);
        break;
      }
  },

  _getCurrentPref: function () {
    return PreferencesStore.get(this.props.id);
  },

  _handleThemeClicked: function (option) {
    var currentSelection = this._getCurrentPref();
    if (option === "light" && option !== currentSelection) {
      AnalyticsActions.lightThemeSelected();
    } else if (option === "dark" && option !== currentSelection) {
      AnalyticsActions.darkThemeSelected();
    }
  },

  _handleDensityClicked: function (option) {
    var currentSelection = this._getCurrentPref();
    if (option === "normal" && option !== currentSelection) {
      AnalyticsActions.normalTextDensitySelected();
    } else if (option === "tighter" && option !== currentSelection) {
      AnalyticsActions.tighterTextDensitySelected();
    }
  },

  _handleChatViewClicked: function (option) {
    var currentSelection = this._getCurrentPref();
    if (option === "classic" && option !== currentSelection) {
      AnalyticsActions.classicChatViewSelected();
    } else if (option === "classic_neue" && option !== currentSelection) {
      AnalyticsActions.classicNeueChatViewSelected();
    }
  },

  _handleNameDisplayClicked: function (option) {
    var currentSelection = this._getCurrentPref();
    if (option === "names" && option !== currentSelection) {
      AnalyticsActions.fullNamesNameDisplaySelected();
    } else if (option === "mentions" && option !== currentSelection) {
      AnalyticsActions.mentionNamesNameDisplaySelected();
    }
  },

  _handleAnimatedAvatarsClicked: function (option) {
    var currentSelection = this._getCurrentPref();
    if (option === "animated" && option !== currentSelection) {
      AnalyticsActions.animatedAvatarsSelected();
    } else if (option === "static" && option !== currentSelection) {
      AnalyticsActions.staticAvatarsSelected();
    }
  },

  render: function () {
    return (
      <fieldset className="group">
        <legend>
          <span>{this.props.label}</span>
        </legend>
        {
          this.props.options.map((option) => {
              let key = `radio-${this.props.id}-${option}`;
              return <AuiRadio
                val={option}
                id={option}
                key={key}
                label={strings[option]}
                name={this.props.id}
                defaultChecked={this._isDefaultChecked(option)}
                onChange={this._handleAnalytics.bind(this, option)} />;
          })
        }
      </fieldset>

    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/settings_dialog/preference_radio_field.js
 **/