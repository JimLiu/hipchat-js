import InlineDialog from 'components/common/inline_dialog/inline_dialog';
import PresenceIcon from 'components/common/icon/presence-icon';
import AppDispatcher from 'dispatchers/app_dispatcher';
import InlineDialogActions from 'actions/inline_dialog_actions';
import CurrentUserActions from 'actions/current_user_actions';
import AppConfig from 'config/app_config';

export default React.createClass({

  displayName: 'UserStatusMessageForm',

  getInitialState: function() {
    return {
      text: this.props.status,
      is_status_updated: false
    };
  },

  getDefaultProps: function() {
    return {
      visible: false
    };
  },

  componentDidMount: function() {
    AppDispatcher.register('position-app-header-dialogs', this._positionDialog);
    this._positionDialog();
    this._focusAndSelect();
  },

  componentDidUpdate: function () {
    this._positionDialog();
  },

  componentWillUnmount: function () {
    AppDispatcher.unregister('position-app-header-dialogs', this._positionDialog);

    if (!this.state.is_status_updated) {
      CurrentUserActions.changeStatus({
        show: this.props.show,
        status: '',
        type: 'status'
      });
    }
  },

  _positionDialog: function () {
    var anchor = this.props.anchor,
      node = ReactDOM.findDOMNode(this),
      top;

    if (anchor) {
      _.delay(function() {
        top = anchor.getBoundingClientRect().bottom + 5;
        $(node).css({
          top: top + "px",
          display: 'block'
        });
      }, AppConfig.notification_banner_slide);
    }
  },

  _focusAndSelect: function() {
    var input = this.refs.input;

    // Using `_.delay` here as this component is set to 'display:none' initially,
    // so wait until after it is revealed in `_positionDialog`.
    _.delay(() => {
      input.focus();
      input.select();
    }, AppConfig.notification_banner_slide);
  },

  _onSubmit: function(e) {
    e.preventDefault();
    this.setState({is_status_updated: true}, () => {
      CurrentUserActions.changeStatus({
        show: this.props.show,
        status: this.state.text,
        type: 'status'
      });
      InlineDialogActions.hideInlineDialog();
    });
  },

  render: function() {
    return (
      <InlineDialog dialogId="userStatusMessage">
        <form id="userStatusForm" className="aui aui-group" onSubmit={this._onSubmit}>
          <div className="aui-item status-icon">
            <PresenceIcon presence={this.props.show} uid={this.props.current_user_id}/>
          </div>
          <div className="aui-item status-message">
            <input
              type="text"
              className="text"
              placeholder="Set your status"
              maxLength={AppConfig.max_presence_text_length}
              name="status-message"
              value={this.state.text}
              ref="input"
              onChange={this._onChange}/>
          </div>
          <div className="aui-item">
            <button className="aui-button aui-button-small" type="submit">OK</button>
          </div>
        </form>
      </InlineDialog>
    );
  },

  _onChange: function(e) {
    this.setState({text: e.target.value});
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/user_status_message_form.js
 **/