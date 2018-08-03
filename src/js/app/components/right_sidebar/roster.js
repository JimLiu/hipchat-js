import PersonHelper from 'helpers/person_helper';
import PersonAvatar from 'components/common/avatars/person_avatar';
import RosterEmptyState from './roster_empty_state';
import strings from 'strings/roster_panel_strings';
import utils from 'helpers/utils';
import RosterStore from 'stores/roster_store';
import PermissionsStore from 'stores/permissions_store';
import ConfigStore from 'stores/configuration_store';
import RightPanelActions from 'actions/right_panel_actions';
import DialogActions from 'actions/dialog_actions';
import SidebarActions from 'actions/sidebar_actions';
import cx from 'classnames';
import RoomSize from 'lib/enum/room_size';
import {roster_panel} from 'config/app_config';

module.exports = React.createClass({

  displayName: "RightSideBarRoster",

  propTypes: {
    is_guest: React.PropTypes.bool.isRequired
  },

  getInitialState: function() {
    return _.assign(this._getState(), {
      selectedPerson: false
    });
  },

  componentDidMount: function() {
    var size = 0;

    var members = _.get(this.state, "participants.members");
    if (members){
      size = members.length;
    }

    RosterStore.on(['change'], this._onChange);

    var id = RosterStore.get('active_chat');
    RightPanelActions.rosterMounted({id: id, size: size});
  },

  componentWillUnmount: function() {
    RosterStore.off(['change'], this._onChange);
  },

  _getState: function() {
    return {
      can_view_guest_access: PermissionsStore.canViewGuestAccess(),
      should_animate_gif_avatars: !ConfigStore.get('feature_flags').web_client_freeze_gifs,
      active_chat_privacy: RosterStore.get('active_chat_privacy'),
      admins: RosterStore.get('admins'),
      owner: RosterStore.get('owner'),
      participants: RosterStore.get('participants'),
      users: RosterStore.get('users'),
      current_user: RosterStore.get("current_user"),
      user_is_admin: RosterStore.get('user_is_admin'),
      guest_url: RosterStore.get('guest_url'),
      invite_url: RosterStore.get('invite_url'),
      active_chat: RosterStore.get('active_chat'),
      size: RosterStore.get('size'),
      roster: RosterStore.getRoster()
    };
  },

  _onChange: function() {
    var newState = _.assign(this._getState(), {
      selectedPerson: this.state.selectedPerson
    });

    if (this.isMounted()){
      this.setState(newState);
    }
  },

  _onClick: function(jid) {
    this.setState({
      selectedPerson: jid
    });
  },

  _onDoubleClick: function (jid, name) {
    if (_.find(this.state.participants.members, { jid }) && !this.props.is_guest) {
      SidebarActions.openChat({ jid, name });
    }
  },

  _showEmptyState: function () {
    var current_user_jid = this.state.current_user.user_jid,
        members = this.state.participants['members'],
        guests = this.state.participants['guests'],
        result;

    if (members.length === 1 && !guests.length) {
      result = _.find(members, {jid: current_user_jid});
    } else if (guests.length === 1 && !members.length) {
      result = _.find(guests, {jid: current_user_jid});
    }
    return (result) ? true : false;
  },

  _isAdmin: function (user) {
    return utils.user.is_admin(this.state.admins, false, user);
  },

  _isOwner: function (user) {
    var id = _.get(user, 'user_id') || _.get(user, 'id');
    return Number(id) === Number(this.state.owner);
  },

  _hasMembersAndGuests: function () {
    return _.size(this.state.participants['members']) && _.size(this.state.participants['guests']);
  },

  _getTooltip(user) {
    return PersonHelper.get_user_tooltip({
      name: user.name,
      mention_name: user.mention_name,
      is_admin: this._isAdmin(user),
      is_owner: this._isOwner(user),
      presence: user.presence
    });
  },

  _renderItem: function(index, key) {
    let item = this.state.roster[index],
        style = {
          'height': `${roster_panel.group_title_item_height}px`
        };

    if (item.group_title) {
      return (
        <li key={key} className="aui-nav-heading" style={style}>
          <div className="uppercase">{strings[item.group_title]}</div>
        </li>
      );
    } else if (item.letter) {
      return (
        <li key={key} className="aui-nav-heading" style={style}>
          <div className="uppercase">{item.letter}</div>
        </li>
      );
    }

    return this._getPerson(item, key);
  },

  _getPerson(user, key) {
    var presence = _.get(user, 'presence', {}),
        tooltip = this._getTooltip(user),
        linkClasses = cx({
          'hc-roster-link': true,
          'hc-roster-admin': this._isAdmin(user)
        }),
        rosterItemClasses = cx({
          'hc-roster-item': true,
          'aui-nav-selected': (this.state.selectedPerson === user.jid)
        }),
        style = {
          height: 'auto'
        },
        id = user.id || utils.jid.user_id(user.jid);

    if (this.state.size !== RoomSize.SMALL) {
      style.height = `${roster_panel.person_item_height}px`;
    }

    return (
      <li key={`user-${id}`}
          className={rosterItemClasses}
          data-status={presence.show}
          onClick={this._onClick.bind(this, user.jid)}
          onDoubleClick={this._onDoubleClick.bind(this, user.jid, user.name)}
          style={style}>
        <div className="aui-nav-item">
          <PersonAvatar avatar_url={user.photo_url}
                        name={user.name}
                        presence={presence.show}
                        size={this._getAvatarSize()}
                        shouldAnimate={this.state.should_animate_gif_avatars}
                        uid={user.id}/>
          <a className={linkClasses} aria-label={tooltip}>{user.name}</a>
        </div>
      </li>
    );
  },

  _getItemSize: function(index) {
    let item = this.state.roster[index];

    if (item.group_title || item.letter) {
      return roster_panel.group_title_item_height;
    }
    return roster_panel.person_item_height;
  },

  _getAvatarSize() {
    if (this.state.size === RoomSize.SMALL) {
      return 'small';
    }
    return 'xsmall';
  },

  _onClickQuickSwitcher() {
    DialogActions.showQuickSwitcherDialog();
  },

  _getXLargeState() {
    return <div className="hc-roster-xlarge-msg">
      {strings.xlarge_message} <a onClick={this._onClickQuickSwitcher}>{strings.quick_switcher}</a>.
    </div>;
  },

  _getEmptyState() {
    return (<RosterEmptyState room_privacy={this.state.active_chat_privacy}
                               isAdmin={this._isAdmin(this.state.users[this.state.current_user.user_jid])}
                               invite_url={this.state.invite_url}
                               user_is_admin={this.state.user_is_admin}/>);
  },

  _getList() {
    if (this.state.size === RoomSize.XLARGE) {
      return null;
    } else if (this.state.size === RoomSize.LARGE) {
      return this._getDynamicList();
    }
    return this._getStaticList();
  },

  _getStaticList() {
    return _.map(this.state.roster, (user, u) => {
      return this._renderItem(u, u);
    });
  },

  _getDynamicList() {
    return (<ReactList
      itemRenderer={this._renderItem}
      itemSizeGetter={this._getItemSize}
      items={this.state.roster}
      length={this.state.roster.length}
      selected={this.state.selectedPerson}
      threshold={200}
      useTranslate3d={false}
      type='variable' />);
  },

  render: function() {
    let guestAccessEnabled = this.state.guest_url && !this.props.is_guest && this.state.can_view_guest_access,
        emptyState = this._showEmptyState() ? this._getEmptyState() : null,
        xLargeState = this.state.size === RoomSize.XLARGE ? this._getXLargeState() : null,
        guest_url_message;

    var rosterWrapClasses = cx({
      'roster-wrap': true,
      'guest-access-enabled': guestAccessEnabled
    });

    var rosterClasses = cx({
      'hc-roster': true,
      'hc-sidebar-scroll': true
    });

    var listClasses = cx({
      'aui-nav': true,
      'aui-navgroup-vertical': true,
      'roster-list': true
    });

    var list = this._getList();

    if (guestAccessEnabled) {
      let guest_url_string = this.state.guest_url.split('://').pop();
      guest_url_message = (
        <div className="guest-access">
          <strong>{strings.guest_access_enabled}</strong>
          <br />
          <a href={this.state.guest_url} target="_blank">{guest_url_string}</a>
        </div>
      );
    }

    return (
      <div className={rosterWrapClasses}>
        <div className={rosterClasses}>
          {xLargeState}
          <ul className={listClasses} data-skate-ignore>
            {list}
          </ul>
          {emptyState}
        </div>
        {guest_url_message}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/roster.js
 **/