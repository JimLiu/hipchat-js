import AuiCheckboxField from 'components/common/aui/form/aui_checkbox_field';
import FlagActions from 'actions/flag_actions';
import DialogActions from 'actions/dialog_actions.js';
import FormActions from 'actions/form_actions';
import FormsStore from 'stores/forms_store';
import strings from 'strings/forms_strings';

export default React.createClass({

  displayName: 'RemoveUsersForm',

  shouldComponentUpdate() {
    return !ReactDOM.findDOMNode(this.refs['form']).querySelectorAll(':checked').length;
  },

  componentDidMount() {
    FormsStore.on(['change:users', 'change:activeChat', 'change:activeChatParticipants'], this._onChange);
  },

  componentDidUpdate() {
    ReactDOM.findDOMNode(this.refs.form).reset();
    if ($(ReactDOM.findDOMNode(this.refs.form)).find('.aui-select2')) {
      AJS.$(ReactDOM.findDOMNode(this.refs.form)).find('.aui-select2').auiSelect2('data', null);
    }
  },

  componentWillUnmount() {
    FormsStore.off(['change:users', 'change:activeChat', 'change:activeChatParticipants'], this._onChange);
  },

  getInitialState() {
    return this._getState();
  },

  _onChange(){
    this.setState(this._getState());
  },

  _getState(){
    return {
      activeChatParticipants: FormsStore.get('activeChatParticipants'),
      users: FormsStore.get('users'),
      activeChat: FormsStore.get('activeChat')
    };
  },

  _getName(jid) {
    return this.state.users[jid].name;
  },

  _getUID(jid) {
    return Number(this.state.users[jid].id);
  },

  _isAdmin(jid) {
    return _.includes(this.state.activeChat.admins, this._getUID(jid));
  },

  _sortParticipants() {
    var participants = _.map(this.state.activeChatParticipants, (jid) => {
      return {
        jid: jid,
        name: this._getName(jid),
        isAdmin: this._isAdmin(jid)
      };
    });
    return _.sortBy(participants, ['isAdmin', 'name']);
  },

  _onSubmit(e) {
    e.preventDefault();
    var form_inputs = $(ReactDOM.findDOMNode(this.refs.form)).serializeArray(),
        submit_data = {
          room_jid: this.state.activeChat.jid,
          user_jids: _.map(form_inputs, 'value')
        };

    if (submit_data.user_jids.length) {
      FormActions.removeUsers(submit_data, this._handleResponse);
    } else {
      this._throwFlagError(strings.fail.no_users_flag);
    }
    this._closeDialog();
  },

  _handleResponse(data) {
    if (data.error) {
      var error_msg = (_.get(data, 'error.text.__text')) ? data.error.text.__text : strings.fail.remove_users;
      this._throwFlagError(error_msg);
    } else {
      this._throwFlagSuccess(strings.success.users_removed);
    }
  },

  _throwFlagSuccess(msg) {
    FlagActions.showFlag({
      type: 'success',
      body: msg,
      close: 'auto'
    });
  },

  _throwFlagError(error) {
    FlagActions.showFlag({
      type: 'error',
      body: this._flagBody(error),
      close: 'manual'
    });
  },

  _flagActionClick(e) {
    e.preventDefault();
    var flag_index = $(e.target).closest('.hc-flag').data('flag-index');
    FlagActions.removeFlag(flag_index);
    this._showDialog();
  },

  _flagBody(error_msg) {
    return () => (
        <div>
          <p className="hc-message-body">{error_msg}</p>
          <ul className="aui-nav-actions-list">
            <li><a onClick={this._flagActionClick} href="#">{strings.button.try_again}</a></li>
          </ul>
        </div>
      );
  },

  _showDialog() {
    DialogActions.showRemoveUsersDialog();
  },

  _closeDialog() {
    DialogActions.closeDialog();
  },

  render() {
    var sortedParticipants = this._sortParticipants();
    return (
      <form id="remove-users-form" ref="form" className="aui" onSubmit={this._onSubmit}>
        <div >{strings.description.choose_people_to_remove}</div>
        {
          _.map(sortedParticipants, (user, index) => {
            return <AuiCheckboxField id={user.jid} value={user.jid} label={user.name} disabled={user.isAdmin} key={index}/>;
          })
        }
      </form>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/remove_users_form.js
 **/