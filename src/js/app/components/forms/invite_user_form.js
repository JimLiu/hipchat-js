import AuiSelect2FieldGroup from "components/common/aui/form/aui_select2_fieldgroup";
import AuiTextAreaFieldGroup from "components/common/aui/form/aui_textarea_fieldgroup";
import FlagActions from "actions/flag_actions";
import FormActions from "actions/form_actions";
import DialogActions from "actions/dialog_actions";
import FormsStore from "stores/forms_store";
import CurrentUserStore from "stores/current_user_store";
import strings from 'strings/forms_strings';
import FormErrors from "strings/form_error_strings";
import utils from "helpers/utils";
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';
import AnalyticsActions from 'actions/analytics_actions';
import AnalyticsKeys from 'keys/analytics_keys';
import CommonStrings from 'strings/common_strings';
import UserUtils from 'helpers/user_utils';

const NO_MATCHES_FOUND_LINK_ID = 'invite-users-select-no-matches-found';

export default React.createClass({

  displayName: "InviteUsersForm",

  mixins: [DeepEqualRenderMixin],

  componentDidMount: function() {
    FormsStore.on(['change:activeChatParticipants', 'change:users', 'change:web_server'], this._onChange);
    this.shouldAutoFocus = true;
    document.addEventListener('click', this._onDocumentClick, true);
  },

  componentDidUpdate: function() {
    if (this.props.dialogVisible && this.shouldAutoFocus) {
      this._focusInput();
      this.shouldAutoFocus = false;
    }
  },

  componentWillUnmount: function() {
    FormsStore.off(['change:activeChatParticipants', 'change:users', 'change:web_server'], this._onChange);
    document.removeEventListener('click', this._onDocumentClick, true);
  },

  getInitialState: function () {
    return this._getState();
  },

  _onChange: function(){
    this.setState(this._getState());
  },

  _getState: function(){
    return {
      user_is_admin: FormsStore.get("user_is_admin"),
      invite_url: FormsStore.get("invite_url"),
      web_server: FormsStore.get("web_server"),
      users: FormsStore.get("users"),
      jid: CurrentUserStore.get('jid'),
      activeChatParticipants: FormsStore.get("activeChatParticipants"),
      errors: _.get(this, 'state.errors', {})
    };
  },

  _onDocumentClick(evt){
    if (evt.target.id === NO_MATCHES_FOUND_LINK_ID){
      if (evt.target.getAttribute('target') === '_blank'){
        evt.stopPropagation();
        return;
      }
      evt.preventDefault();
      DialogActions.showInviteTeammatesDialog({ type: AnalyticsKeys.INVITE_USERS_DIALOG, default_text: evt.target.getAttribute('data-term')});
      AnalyticsActions.inviteTeamClickedEvent(AnalyticsKeys.INVITE_USERS_DIALOG);
    }
  },

  _rosterForSelect: function () {
    let nonGuestUsers = utils.roster.get_non_guest_users(this.state.users);

    return utils.roster.format_for_select2(_.union(this.state.jid, this.state.activeChatParticipants), nonGuestUsers);
  },

  _onSubmit: function (e) {
    e.preventDefault();
    var form_inputs = $(ReactDOM.findDOMNode(this.refs.form)).serializeArray(),
        users = form_inputs[0].value,
        msg = utils.strings.stripHiddenCharacters(form_inputs[1].value.trim()).slice(0, 250),
        promises = [],
        errors;

    errors = this._validate(users, msg);
    if (errors) {
      this.setState({
        errors: errors
      });
    } else {
      promises.push(this._inviteUsers(users.split(','), msg));
      this._handlePromises(promises);
      this._closeDialog();
    }
  },

  _validate: function (users, msg) {
    if (!users) {
      return {
        user: FormErrors.invite_users_form.no_users
      };
    }
  },

  _inviteUsers: function (user_jids, msg) {
    return new Promise( (resolve) => {
      FormActions.inviteUsers({
        room_jid: this.props.room_jid,
        user_jids: user_jids,
        reason: msg
      });
      resolve(user_jids);
    });
  },

  _handlePromises: function (promises) {
    Promise.all(promises).then(function(data) {
      this._throwFlagSuccess();
      if (this.props.type){
         AnalyticsActions.inviteUsersToRoomSent(this.props.type, data[0].length);
      }
    }.bind(this), function() {
      this._throwFlagError();
    }.bind(this));
  },

  _throwFlagSuccess: function () {
    FlagActions.showFlag({
      type: "success",
      body: strings.success.users_invited,
      close: "auto"
    });
  },

  _throwFlagError: function () {
    FlagActions.showFlag({
      type: "error",
      body: this._flagErrorActions(strings.fail.invite_fail),
      close: "manual"
    });
  },

  _flagErrorActions: function (error_msg) {
    return () => (
        <div>
          <p className="hc-message-body">{error_msg}</p>
          <ul className="aui-nav-actions-list">
            <li><a onClick={this._flagActionClick} href="#">strings.button.try_again</a></li>
          </ul>
        </div>
    );
  },

  _flagActionClick: function (e) {
    e.preventDefault();
    var flag_index = $(e.target).closest(".hc-flag").data('flag-index');
    FlagActions.removeFlag(flag_index);
    this._showDialog();
  },

  _showDialog: function () {
    DialogActions.showInviteUsersDialog();
  },

  _closeDialog: function () {
    DialogActions.closeDialog();
  },

  _focusInput: function () {
    // Can't use the ref here, because the Select2 plugin has it's own abstraction.
    ReactDOM.findDOMNode(this).querySelector('input[type=text]:first-of-type').focus();
  },

  _selectFormatNoMatches: function(term) {

    let link = '';

    if (this.state.user_is_admin || this.state.invite_url){

      link = `<a href="#" data-term="${term}" id="${NO_MATCHES_FOUND_LINK_ID}" className="aui-inline-dialog-trigger">${CommonStrings.buttons.invite_team_in_invite_users_dialog}</a>`;

      if (!this.state.invite_url) {
        link = `<a href="https://${this.state.web_server}/admin" target="_blank" id="${NO_MATCHES_FOUND_LINK_ID}" className="aui-inline-dialog-trigger">${CommonStrings.buttons.invite_team_in_invite_users_dialog}</a>`;
      }
    }

    return `${CommonStrings.no_one_found}. ${link}`;
  },

  render: function () {
    var errors = this.state.errors;
    return (
      <form id="invite-users-form" ref="form" className="aui" onSubmit={this._onSubmit}>
        <AuiSelect2FieldGroup
          id="invite-users-people"
          label={strings.label.these_people}
          multiple={true}
          data={this._rosterForSelect()}
          selected={this.props.invite_user_jids}
          sortResults={(results, ctx, search) => UserUtils.sort_users(results, search.term, 'text')}
          error={errors.user}
          ref="user_select"
          formatNoMatches = {this._selectFormatNoMatches}
        />
        <AuiTextAreaFieldGroup
          id="invite-users-message"
          label={strings.label.message}
          rows="5"
          maxLength="250"
          ref="invite_message" />
      </form>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/invite_user_form.js
 **/