import ModalDialogVisibilityMixin from 'components/mixins/modal_dialog_visibility_mixin';
import DialogActions from "actions/dialog_actions";
import AnalyticsActions from 'actions/analytics_actions';
import QuickSwitcherContent from "./quick_switcher_content";
import utils from 'helpers/utils';

export default React.createClass({

  displayName: "QuickSwitcherDialog",

  mixins: [ModalDialogVisibilityMixin],

  componentDidMount () {
    AnalyticsActions.quickSwitcherViewed();
    document.querySelector("body").addEventListener('keydown', this._onKeyDown, true);
    this._focusInput();
  },

  componentWillUnmount () {
    clearTimeout(this.timeout);
    document.querySelector("body").removeEventListener('keydown', this._onKeyDown, true);
  },

  close () {
    if (!this.timeout){
      this.timeout = setTimeout(() => {
        DialogActions.closeDialog();
      }, 300);
    }
  },

  _onKeyDown (e) {
    var key = (window.Event) ? e.which : e.keyCode;
    if (key === utils.keyCode.Esc) {
      e.stopPropagation();
      e.preventDefault();
      this.close();
    }
  },

  _focusInput () {
    var $input = $(ReactDOM.findDOMNode(this.refs.qs_content)).find("input");
    if ($input.length) {
      $input.focus();
    }
  },

  render () {
    return (
      <section role="dialog" id="quick-switcher-dialog" className="hc-qs" aria-hidden={!this.state.dialogVisible}>
        <QuickSwitcherContent ref="qs_content" hideHint={this.props.hideHint}/>
      </section>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/quick_switcher/quick_switcher_dialog.js
 **/