import PreferencesStore from 'stores/preferences_store';
import AppConfig from 'config/app_config';

export default React.createClass({

  displayName: 'Spinner',

  propTypes: {
    size: React.PropTypes.oneOf(['small', 'medium', 'large']).isRequired,
    delay: React.PropTypes.number
  },

  componentWillUnmount() {
    this._stopSpinner();
  },

  componentWillUpdate() {
    this._stopSpinner();
  },

  getDefaultProps() {
    return {
      size: 'medium',
      zIndex: 100,
      ref: 'spinner',
      delay: 0
    };
  },

  componentDidMount() {
    this._setSpinner();
  },

  componentDidUpdate() {
    this._setSpinner();
  },

  _getSpinner(){
    return ReactDOM.findDOMNode(this);
  },

  _setSpinner() {
    var options;

    if (this.props.spin) {
      options = this._getOptions();
      this._startSpinner(this.props.size, options);
    } else {
      this._stopSpinner();
    }
  },

  _getColor() {
    var theme = PreferencesStore.getTheme();
    return AppConfig.spinner_colors[theme];
  },

  _getOptions() {
    var options = _.clone(this.props);

    if (!options.color) {
      options.color = this._getColor();
    }

    return options;
  },

  _startSpinner(optsOrPreset, opts) {
    let spinner = AJS.$(this._getSpinner());
    if (this.props.delay > 0) {
      this.timer = setTimeout(() => { spinner.spin(optsOrPreset, opts); }, this.props.delay);
    } else {
      spinner.spin(optsOrPreset, opts);
    }
  },

  _stopSpinner() {
    if (this.timer) {
      this.timer = clearTimeout(this.timer);
    }
    AJS.$(this._getSpinner()).spinStop();
  },

  render(){
    return (
      <div className={'hc-spinner ' + ((this.props.spinner_class) ? this.props.spinner_class : '')} ref={this.props.ref}></div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/spinner/spinner.js
 **/