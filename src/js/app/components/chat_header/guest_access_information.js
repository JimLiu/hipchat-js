import AppDispatcher from 'dispatchers/app_dispatcher';
import AppConfig from 'config/app_config';
import InlineDialog from 'components/common/inline_dialog/inline_dialog';
import InlineDialogActions from 'actions/inline_dialog_actions';
import strings from 'strings/guest_access_information_strings';

export default React.createClass({

  displayName: "GuestAccessInformation",
  debouncedMouseOut: null,

  getDefaultProps: function() {
    return {
      visible: false
    };
  },

  componentDidMount: function() {
    AppDispatcher.register('position-app-header-dialogs', this._positionDialog);
    this._positionDialog();

    this.debouncedMouseOut = _.debounce( e => this._onMouseOut(e), AppConfig.guest_access_information.mouseout_delay);
    document.addEventListener('mouseout', this.debouncedMouseOut);

    _.delay(() => {
      this._focusAndSelectInput();
    }, AppConfig.guest_access_information.focus_and_select_delay);
  },

  componentDidUpdate: function () {
    this._positionDialog();
  },

  componentWillUnmount: function () {
    AppDispatcher.unregister('position-app-header-dialogs', this._positionDialog);

    document.removeEventListener('mouseout', this.debouncedMouseOut);
    this.debouncedMouseOut.cancel();
    this.debouncedMouseOut = null;
  },

  _positionDialog: function () {
    let anchor = this.props.anchor,
        node = ReactDOM.findDOMNode(this),
        rect,
        top,
        left;

    if (anchor) {
      _.delay(() => {
        rect = anchor.getBoundingClientRect();
        top = rect.bottom + 5;
        left = rect.left + rect.width / 2;
        $(node).css({
          top: `${top}px`,
          left: `${left}px`,
          display: 'block'
        });
      }, AppConfig.notification_banner_slide);
    }
  },

  _onMouseOut() {
    InlineDialogActions.hideInlineDialog();
  },

  _onMouseOver() {
    this.debouncedMouseOut.cancel();
  },

  _focusAndSelectInput() {
    if (this.isMounted()){
      let input = ReactDOM.findDOMNode(this.refs.input);
      input.focus();
      input.setSelectionRange(0, input.value.length);
    }
  },

  render: function() {
    let description = strings.share_this_link_to_invite;

    return (
      <InlineDialog dialogId="guestAccessInformation" onMouseOver={this._onMouseOver}>
        <form className="aui aui-group">
          <div className="aui-item guest-access-url">
            <input type="text" className="text" value={this.props.guest_url} ref="input" readOnly />
            <div className="description">{description}</div>
          </div>
        </form>
      </InlineDialog>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/guest_access_information.js
 **/