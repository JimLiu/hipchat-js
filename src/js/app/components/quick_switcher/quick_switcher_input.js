import QuickSwitcherActions from 'actions/quick_switcher_actions';
import DialogActions from 'actions/dialog_actions';
import strings from 'strings/quick_switcher_strings';
import utils from 'helpers/utils';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import mousePosition from 'helpers/mouse_position';

export default React.createClass({

  displayName: 'QuickSwitcherInput',

  mixins: [PureRenderMixin],

  propTypes: {
    scrollTop: React.PropTypes.func,
    scrollToSelected: React.PropTypes.func,
    text: React.PropTypes.string,
    canNavigate: React.PropTypes.bool
  },

  componentDidMount () {
    this.debouncedFilter = _.debounce(this._filter, 150);
  },

  componentWillUnmount () {
    this.debouncedFilter.cancel();
  },

  _onInputChange (e) {
    QuickSwitcherActions.setInputText({
      text: e.target.value
    });
    this.debouncedFilter();
  },

  _filter () {
    QuickSwitcherActions.filter();
    this.props.scrollTop();
  },

  _onKeyDown (e) {

    if (e.keyCode === utils.keyCode.UpArrow || e.keyCode === utils.keyCode.DownArrow){
      e.preventDefault();
      mousePosition.useLatest();

      if (!this.props.canNavigate){
        return;
      }

      if (e.keyCode === utils.keyCode.UpArrow) {
        QuickSwitcherActions.selectPrev();
        this.props.scrollToSelected();
      }

      if (e.keyCode === utils.keyCode.DownArrow) {
        QuickSwitcherActions.selectNext();
        this.props.scrollToSelected();
      }
    } else if (e.keyCode === utils.keyCode.Tab){
      e.preventDefault();
    } else if (e.keyCode === utils.keyCode.Enter) {
      e.preventDefault();
      DialogActions.closeDialog();
      QuickSwitcherActions.selectItem();
    }
  },

  render () {

    /*
     * HC-19280 Using an absolutely positioned label instead of an input placeholder here b/c IE10 & 11
     * hide placeholders when the input is focused. Since the quick-switcher opens up focused,
     * there's no visible instructions as to what this dialog is for
     */
    let labelClass = this.props.text.length ? 'hidden' : '';

    return (
      <div className='hc-qs-input-wrap'>
        <form className='aui' autoComplete='off'>
          <label ref='input_label' htmlFor='quickSwitcher' className={ labelClass }>{strings.input_placeholder}</label>
          <input name='quickSwitcher'
            id='quickSwitcher'
            className='text long-field hc-qs-input'
            type='text'
            ref='input_field'
            onChange={this._onInputChange}
            onKeyDown={this._onKeyDown}
            value={this.props.text} />
        </form>
      </div>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/quick_switcher/quick_switcher_input.js
 **/